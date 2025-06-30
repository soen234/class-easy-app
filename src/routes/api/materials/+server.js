import { json } from '@sveltejs/kit';
import { createAuthClient } from '$lib/server/database.js';

// GET /api/materials - 자료 목록 조회
export async function GET({ url, locals, request, cookies }) {
  const user = locals.user;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || cookies.get('sb-lyjmljtnbodquvwkoizz-auth-token');
  
  if (!accessToken) {
    return json({ error: 'No access token found' }, { status: 401 });
  }

  const folderId = url.searchParams.get('folderId');
  const type = url.searchParams.get('type');
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createAuthClient(accessToken);
  
  let query = supabase
    .from('materials')
    .select('*, folders(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  if (type) {
    query = query.eq('file_type', type);
  }

  const { data, error } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  // count를 가져오기 위한 별도 쿼리
  let countQuery = supabase
    .from('materials')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (folderId) {
    countQuery = countQuery.eq('folder_id', folderId);
  }
  if (type) {
    countQuery = countQuery.eq('file_type', type);
  }

  const { count } = await countQuery;

  return json({
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    }
  });
}

// POST /api/materials - 자료 업로드
export async function POST({ request, locals, cookies }) {
  const user = locals.user;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  const accessToken = authHeader?.replace('Bearer ', '') || cookies.get('sb-lyjmljtnbodquvwkoizz-auth-token');
  
  if (!accessToken) {
    return json({ error: 'No access token found' }, { status: 401 });
  }

  try {
    const supabase = createAuthClient(accessToken);
    const formData = await request.formData();
    const file = formData.get('file');
    const folderId = formData.get('folder_id');
    const metadata = JSON.parse(formData.get('metadata') || '{}');
    
    console.log('Upload request:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      folderId,
      userId: user.id 
    });

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    // 파일 유효성 검사
    const validTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (!validTypes.includes(file.type)) {
      return json({ error: '지원하지 않는 파일 형식입니다.' }, { status: 400 });
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return json({ error: '파일 크기가 너무 큽니다. (최대 100MB)' }, { status: 400 });
    }

    // 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Storage에 업로드
    console.log('Uploading to Storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('materials-original')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return json({ error: '파일 업로드 실패: ' + uploadError.message }, { status: 500 });
    }
    
    console.log('Upload successful:', uploadData);

    // 데이터베이스에 저장
    const { data: material, error: dbError } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        folder_id: folderId || null,
        title: file.name.replace(/\.[^/.]+$/, ''), // 확장자 제거
        original_filename: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        mime_type: file.type,
        status: 'uploaded',
        metadata: metadata || {},
        type: 'original',
        subject: metadata?.subject || '미분류',
        is_extracted: false,
        extracted_count: 0,
        pages: null
      })
      .select()
      .single();

    if (dbError) {
      // 업로드된 파일 삭제
      await supabase.storage.from('materials-original').remove([fileName]);
      return json({ error: '데이터베이스 저장 실패: ' + dbError.message }, { status: 500 });
    }

    return json({ data: material }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return json({ error: '업로드 중 오류가 발생했습니다.' }, { status: 500 });
  }
}