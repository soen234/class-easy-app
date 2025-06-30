import { json } from '@sveltejs/kit';
import { createAuthClient } from '$lib/server/database.js';

// GET /api/folders - 폴더 목록 조회
export async function GET({ url, locals, request, cookies }) {
  try {
    const user = locals.user;
    const authHeader = request.headers.get('authorization');
    
    console.log('GET /api/folders - user:', user?.id);
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!user) {
      return json({ error: 'Unauthorized - No user in locals' }, { status: 401 });
    }

    // 인증된 Supabase 클라이언트 생성
    const accessToken = authHeader?.replace('Bearer ', '') || cookies.get('sb-lyjmljtnbodquvwkoizz-auth-token');
    
    if (!accessToken) {
      return json({ error: 'No access token found' }, { status: 401 });
    }

    const parentId = url.searchParams.get('parent_id');
    // type이 'original' 또는 'lesson'으로 전달되므로 매핑 필요
    const materialType = url.searchParams.get('type');
    const folderType = materialType || 'materials';  // 모든 자료는 'materials' 폴더 타입 사용

    console.log('Query params:', { parentId, materialType, folderType, userId: user.id });

    // 인증된 클라이언트 생성
    const supabase = createAuthClient(accessToken);
    
    // 모든 materials 타입의 폴더를 가져옴 (original, lesson 구분 없이)
    let query = supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('folder_type', 'materials')  // 항상 'materials' 사용
      .order('name');

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return json({ error: error.message, details: error }, { status: 500 });
    }

    console.log('Folders found:', data?.length || 0);
    return json({ data: data || [] });
  } catch (err) {
    console.error('Unexpected error in GET /api/folders:', err);
    return json({ error: 'Internal server error', details: err.message }, { status: 500 });
  }
}

// POST /api/folders - 새 폴더 생성
export async function POST({ request, locals, cookies }) {
  const user = locals.user;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 인증 토큰 가져오기
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '') || cookies.get('sb-lyjmljtnbodquvwkoizz-auth-token');
    
    if (!accessToken) {
      return json({ error: 'No access token found' }, { status: 401 });
    }
    
    console.log('POST /api/folders - Creating folder for user:', user.id);
    
    // 인증된 클라이언트 생성
    const supabase = createAuthClient(accessToken);
    
    const { name, parent_id, folder_type = 'materials', color, icon } = await request.json();

    // 필수 필드 검증
    if (!name || !name.trim()) {
      return json({ error: '폴더 이름을 입력해주세요.' }, { status: 400 });
    }

    // 이름 길이 제한
    if (name.length > 50) {
      return json({ error: '폴더 이름은 50자 이하여야 합니다.' }, { status: 400 });
    }

    // 특수문자 제한
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return json({ error: '폴더 이름에 특수문자를 사용할 수 없습니다.' }, { status: 400 });
    }


    // 부모 폴더 경로 가져오기
    let pathTokens = [];
    if (parent_id) {
      const { data: parentFolder, error: parentError } = await supabase
        .from('folders')
        .select('path_tokens')
        .eq('id', parent_id)
        .eq('user_id', user.id)
        .single();

      if (parentError || !parentFolder) {
        return json({ error: '부모 폴더를 찾을 수 없습니다.' }, { status: 404 });
      }

      pathTokens = [...(parentFolder.path_tokens || []), parent_id];
    }

    // 중복 이름 체크
    const { data: existing } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .eq('folder_type', folder_type)
      .is('parent_id', parent_id || null)
      .single();

    if (existing) {
      return json({ error: '같은 이름의 폴더가 이미 존재합니다.' }, { status: 409 });
    }

    // 폴더 생성
    const { data, error } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        parent_id: parent_id || null,
        name: name.trim(),
        folder_type,
        color: color || '#gray',
        icon: icon || null,
        path_tokens: pathTokens
      })
      .select()
      .single();

    if (error) {
      return json({ error: error.message }, { status: 500 });
    }

    // 활동 로그 기록 (옵션)
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action_type: 'folder_created',
        resource_type: 'folder',
        resource_id: data.id,
        metadata: { 
          folder_name: data.name,
          parent_id: parent_id 
        }
      });
    } catch (logError) {
      console.log('Activity log error (non-critical):', logError.message);
    }

    return json({ data }, { status: 201 });

  } catch (error) {
    console.error('Folder creation error:', error);
    return json({ error: '폴더 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}