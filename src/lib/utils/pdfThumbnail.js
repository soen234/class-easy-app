import * as pdfjsLib from 'pdfjs-dist';

// PDF.js 4.8 버전용 worker 설정
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function generatePdfThumbnail(fileUrl, options = {}) {
  const {
    scale = 1.5,
    maxWidth = 300,
    maxHeight = 400,
    quality = 0.85
  } = options;

  try {
    // PDF 로드
    const loadingTask = pdfjsLib.getDocument(fileUrl);
    const pdf = await loadingTask.promise;
    
    // 첫 페이지 가져오기
    const page = await pdf.getPage(1);
    
    // 뷰포트 계산
    let viewport = page.getViewport({ scale });
    
    // 최대 크기 제한
    let finalScale = scale;
    if (viewport.width > maxWidth) {
      finalScale = (maxWidth / viewport.width) * scale;
    }
    if (viewport.height > maxHeight) {
      const heightScale = (maxHeight / viewport.height) * scale;
      finalScale = Math.min(finalScale, heightScale);
    }
    
    viewport = page.getViewport({ scale: finalScale });
    
    // Canvas 생성
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    
    // 배경색 설정
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // PDF 페이지 렌더링
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    
    await page.render(renderContext).promise;
    
    // Canvas를 Blob으로 변환
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    
    // 정리
    pdf.destroy();
    
    return {
      blob,
      width: viewport.width,
      height: viewport.height,
      pages: pdf.numPages
    };
    
  } catch (error) {
    console.error('PDF thumbnail generation error:', error);
    throw error;
  }
}