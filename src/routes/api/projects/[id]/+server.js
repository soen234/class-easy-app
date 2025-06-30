import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

// GET /api/projects/:id - 특정 프로젝트 조회
export async function GET({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .or(`user_id.eq.${user.id},collaborators.cs.{${user.id}}`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Project not found' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

// PATCH /api/projects/:id - 프로젝트 수정
export async function PATCH({ params, request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const updates = await request.json();

  // 현재 프로젝트 확인
  const { data: currentProject, error: fetchError } = await supabase
    .from('projects')
    .select('user_id, collaborators, version')
    .eq('id', params.id)
    .single();

  if (fetchError) {
    return json({ error: 'Project not found' }, { status: 404 });
  }

  // 권한 확인
  const isOwner = currentProject.user_id === user.id;
  const isCollaborator = currentProject.collaborators?.includes(user.id);
  
  if (!isOwner && !isCollaborator) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // 허용된 필드만 업데이트
  const allowedFields = ['title', 'description', 'canvas_data', 'settings', 'thumbnail_url', 'is_starred'];
  if (isOwner) {
    allowedFields.push('folder_id', 'collaborators', 'is_public', 'is_template');
  }

  const filteredUpdates = {};
  for (const field of allowedFields) {
    if (field in updates) {
      filteredUpdates[field] = updates[field];
    }
  }

  // 캔버스 데이터가 변경된 경우 버전 저장
  if (updates.canvas_data && JSON.stringify(updates.canvas_data) !== JSON.stringify(currentProject.canvas_data)) {
    // 버전 히스토리 저장
    await supabase.from('project_versions').insert({
      project_id: params.id,
      version_number: currentProject.version + 1,
      canvas_data: currentProject.canvas_data,
      created_by: user.id,
      change_description: updates.changeDescription || 'Manual save'
    });

    filteredUpdates.version = currentProject.version + 1;
  }

  filteredUpdates.last_edited_by = user.id;

  const { data, error } = await supabase
    .from('projects')
    .update(filteredUpdates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({ data });
}

// DELETE /api/projects/:id - 프로젝트 삭제
export async function DELETE({ params, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 소유자만 삭제 가능
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);

  if (error) {
    if (error.code === 'PGRST116') {
      return json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }
    return json({ error: error.message }, { status: 500 });
  }

  return json({ success: true });
}