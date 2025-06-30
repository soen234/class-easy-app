import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

// GET /api/folders/:id - 특정 폴더 정보 조회
export async function GET({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('folders')
    .select(`
      *,
      materials(count),
      subfolders:folders!parent_id(count)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Folder not found' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

// PATCH /api/folders/:id - 폴더 수정
export async function PATCH({ params, request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await request.json();

  // 허용된 필드만 업데이트
  const allowedFields = ['name', 'color', 'icon', 'is_starred'];
  const filteredUpdates = {};
  
  for (const field of allowedFields) {
    if (field in updates) {
      filteredUpdates[field] = updates[field];
    }
  }

  // 이름 변경 시 검증
  if (filteredUpdates.name) {
    // 특수문자 제한
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(filteredUpdates.name)) {
      return json({ error: '폴더 이름에 특수문자를 사용할 수 없습니다.' }, { status: 400 });
    }

    // 현재 폴더 정보 가져오기
    const { data: currentFolder } = await supabase
      .from('folders')
      .select('parent_id, folder_type')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (!currentFolder) {
      return json({ error: 'Folder not found' }, { status: 404 });
    }

    // 중복 이름 체크
    const { data: existing } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', filteredUpdates.name.trim())
      .eq('folder_type', currentFolder.folder_type)
      .is('parent_id', currentFolder.parent_id || null)
      .neq('id', params.id)
      .single();

    if (existing) {
      return json({ error: '같은 이름의 폴더가 이미 존재합니다.' }, { status: 409 });
    }
  }

  const { data, error } = await supabase
    .from('folders')
    .update(filteredUpdates)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Folder not found' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

// DELETE /api/folders/:id - 폴더 삭제
export async function DELETE({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 폴더가 비어있는지 확인
  const { data: folderContents } = await supabase
    .from('folders')
    .select(`
      materials(count),
      subfolders:folders!parent_id(count)
    `)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!folderContents) {
    return json({ error: 'Folder not found' }, { status: 404 });
  }

  const materialCount = folderContents.materials?.[0]?.count || 0;
  const subfolderCount = folderContents.subfolders?.[0]?.count || 0;

  if (materialCount > 0 || subfolderCount > 0) {
    return json({ 
      error: '폴더가 비어있지 않습니다. 먼저 내용을 삭제하거나 이동하세요.',
      details: {
        materials: materialCount,
        subfolders: subfolderCount
      }
    }, { status: 409 });
  }

  // 폴더 삭제
  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}

// POST /api/folders/:id/move - 폴더 이동
export async function POST({ params, request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { parent_id } = await request.json();

  // 자기 자신으로 이동 방지
  if (params.id === parent_id) {
    return json({ error: '폴더를 자기 자신으로 이동할 수 없습니다.' }, { status: 400 });
  }

  // 현재 폴더 정보 가져오기
  const { data: currentFolder } = await supabase
    .from('folders')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!currentFolder) {
    return json({ error: 'Folder not found' }, { status: 404 });
  }

  // 순환 참조 방지 (대상 폴더가 현재 폴더의 하위 폴더인지 확인)
  if (parent_id) {
    const { data: targetFolder } = await supabase
      .from('folders')
      .select('path_tokens')
      .eq('id', parent_id)
      .eq('user_id', user.id)
      .single();

    if (!targetFolder) {
      return json({ error: 'Target folder not found' }, { status: 404 });
    }

    if (targetFolder.path_tokens?.includes(params.id)) {
      return json({ error: '하위 폴더로 이동할 수 없습니다.' }, { status: 400 });
    }
  }

  // 새로운 경로 토큰 계산
  let newPathTokens = [];
  if (parent_id) {
    const { data: parentFolder } = await supabase
      .from('folders')
      .select('path_tokens')
      .eq('id', parent_id)
      .single();

    newPathTokens = [...(parentFolder.path_tokens || []), parent_id];
  }

  // 폴더 이동
  const { data, error } = await supabase
    .from('folders')
    .update({
      parent_id: parent_id || null,
      path_tokens: newPathTokens
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  // 하위 폴더들의 경로 토큰 업데이트
  await updateSubfolderPaths(params.id, newPathTokens, user.id);

  return json({ data });
}

// 하위 폴더 경로 업데이트 헬퍼 함수
async function updateSubfolderPaths(folderId, parentPathTokens, userId) {
  const newParentTokens = [...parentPathTokens, folderId];
  
  // 직접 하위 폴더들 가져오기
  const { data: subfolders } = await supabase
    .from('folders')
    .select('id')
    .eq('parent_id', folderId)
    .eq('user_id', userId);

  if (!subfolders || subfolders.length === 0) return;

  // 각 하위 폴더 업데이트
  for (const subfolder of subfolders) {
    await supabase
      .from('folders')
      .update({ path_tokens: newParentTokens })
      .eq('id', subfolder.id)
      .eq('user_id', userId);

    // 재귀적으로 하위 폴더들도 업데이트
    await updateSubfolderPaths(subfolder.id, newParentTokens, userId);
  }
}