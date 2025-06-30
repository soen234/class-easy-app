import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

// GET /api/materials/:id - 특정 자료 조회
export async function GET({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('materials')
    .select('*, blocks(count)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Material not found' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  // 파일 URL 생성
  const { data: { publicUrl } } = supabase.storage
    .from('materials-original')
    .getPublicUrl(data.file_path);

  data.file_url = publicUrl;

  return json({ data });
}

// PATCH /api/materials/:id - 자료 수정
export async function PATCH({ params, request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await request.json();

  // 허용된 필드만 업데이트
  const allowedFields = ['title', 'folder_id', 'tags', 'is_starred', 'metadata'];
  const filteredUpdates = {};
  
  for (const field of allowedFields) {
    if (field in updates) {
      filteredUpdates[field] = updates[field];
    }
  }

  const { data, error } = await supabase
    .from('materials')
    .update(filteredUpdates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Material not found' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

// DELETE /api/materials/:id - 자료 삭제
export async function DELETE({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 먼저 자료 정보 조회
  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('file_path')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return json({ error: 'Material not found' }, { status: 404 });
    }
    return json({ error: fetchError.message }, { status: 500 });
  }

  // 데이터베이스에서 삭제 (blocks는 CASCADE로 자동 삭제됨)
  const { error: deleteError } = await supabase
    .from('materials')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (deleteError) {
    return json({ error: deleteError.message }, { status: 500 });
  }

  // Storage에서 파일 삭제
  if (material.file_path) {
    const { error: storageError } = await supabase.storage
      .from('materials-original')
      .remove([material.file_path]);

    if (storageError) {
      console.error('Storage deletion failed:', storageError);
    }
  }

  return json({ success: true });
}