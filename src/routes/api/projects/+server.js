import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

// GET /api/projects - 프로젝트 목록 조회
export async function GET({ url, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const folderId = url.searchParams.get('folderId');
  const isStarred = url.searchParams.get('starred') === 'true';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('projects')
    .select('id, title, description, thumbnail_url, is_starred, created_at, updated_at, folders(name)', { count: 'exact' })
    .or(`user_id.eq.${user.id},collaborators.cs.{${user.id}}`)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  if (isStarred) {
    query = query.eq('is_starred', true);
  }

  const { data, error, count } = await query;

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  return json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  });
}

// POST /api/projects - 새 프로젝트 생성
export async function POST({ request, locals }) {
  const user = locals.user;
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectData = await request.json();

  // 기본 캔버스 데이터
  const defaultCanvasData = {
    pages: [{
      id: crypto.randomUUID(),
      name: '페이지 1',
      objects: []
    }]
  };

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: projectData.title || '새 프로젝트',
      description: projectData.description,
      folder_id: projectData.folderId,
      template_id: projectData.templateId,
      canvas_data: projectData.canvasData || defaultCanvasData,
      settings: projectData.settings || {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        gridSize: 10,
        snapToGrid: true,
        showRulers: true
      }
    })
    .select()
    .single();

  if (error) {
    return json({ error: error.message }, { status: 500 });
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    user_id: user.id,
    action_type: 'project_created',
    resource_type: 'project',
    resource_id: data.id,
    metadata: { title: data.title }
  });

  return json({ data }, { status: 201 });
}