import { json } from '@sveltejs/kit';
import { createAuthClient } from '$lib/server/database.js';

// PDF 썸네일 생성은 클라이언트 사이드에서 처리하거나 
// 별도의 서비스를 사용하는 것을 권장합니다.
// pdfjs-dist는 브라우저 환경에 최적화되어 있어 서버 사이드에서 사용 시 문제가 발생할 수 있습니다.

// POST /api/materials/generate-thumbnail - PDF 썸네일 생성 (임시 구현)
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
    const { materialId } = await request.json();
    
    if (!materialId) {
      return json({ error: 'Material ID is required' }, { status: 400 });
    }

    const supabase = createAuthClient(accessToken);
    
    // 자료 정보 조회
    const { data: material, error: materialError } = await supabase
      .from('materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();
    
    if (materialError || !material) {
      return json({ error: 'Material not found' }, { status: 404 });
    }
    
    // PDF 파일만 처리
    if (material.file_type !== 'application/pdf') {
      return json({ error: 'Only PDF files are supported' }, { status: 400 });
    }
    
    // 이미 썸네일이 있으면 반환
    if (material.thumbnail_url) {
      return json({ thumbnailUrl: material.thumbnail_url });
    }
    
    // 임시로 기본 썸네일 URL 반환
    // 실제 구현에서는 클라이언트에서 생성하거나 별도 서비스 사용
    const defaultThumbnailUrl = null;
    
    return json({ 
      thumbnailUrl: defaultThumbnailUrl,
      message: 'Thumbnail generation is not implemented yet. Consider implementing on client side.'
    });
    
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    return json({ error: 'Failed to generate thumbnail' }, { status: 500 });
  }
}