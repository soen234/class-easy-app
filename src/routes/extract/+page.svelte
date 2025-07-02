<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials, updateMaterial, formatFileSize, getFileTypeIcon } from '$lib/stores/materials.js';
  import { addBlock, blocks, fetchBlocks } from '$lib/stores/blocks.js';
  import { goto, pushState, replaceState } from '$app/navigation';
  import { getFile, migrateFromLocalStorage } from '$lib/utils/fileStorage.js';
  import { supabase } from '$lib/supabase.js';
  
  let selectedMaterial = null;
  let currentPage = 1;
  let totalPages = 10;
  let extractionMode = 'manual';
  let selectedBlocks = [];
  let nextBlockId = 1;
  
  // UUID 생성 함수
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  let extractionStep = 'select-material';
  
  // 임시 저장 관련 변수
  let autoSaveInterval = null;
  let lastSavedTime = null;
  let isSaving = false;
  
  // 브라우저 히스토리 관리
  function updateHistory() {
    if (browser) {
      const url = new URL(window.location);
      url.searchParams.set('step', extractionStep);
      if (selectedMaterial) {
        url.searchParams.set('materialId', selectedMaterial.id);
      }
      pushState(url.toString(), { step: extractionStep });
    }
  }
  
  // 뒤로가기 처리
  function handlePopState(event) {
    if (event.state && event.state.step) {
      extractionStep = event.state.step;
    } else {
      // URL 파라미터에서 step 확인
      const stepParam = $page.url.searchParams.get('step');
      if (stepParam) {
        extractionStep = stepParam;
      }
    }
  }
  let isExtracting = false;
  
  // 파일 관련 변수
  let fileDataUrl = null;
  let isLoading = false;
  let pdfDoc = null;
  let canvas;
  let ctx;
  let overlayCanvas;
  let overlayCtx;
  
  // 영역 선택 관련 변수
  let isSelecting = false;
  let selectionStart = null;
  let selectionRect = null;
  let canvasContainer;
  
  // 리사이즈 관련 변수
  let isResizing = false;
  let resizingBlock = null;
  let resizeHandle = null; // 'nw', 'ne', 'sw', 'se'
  let resizeStartPos = null;
  let originalSelection = null;
  let hoveredBlockId = null;
  
  // 줌 관련 변수
  let zoomLevel = 1;
  const zoomStep = 0.1;
  const minZoom = 0.5;
  const maxZoom = 2;
  
  // 렌더링 태스크 관리
  let renderTask = null;
  
  // PDF.js는 브라우저에서만 import
  let pdfjsLib;
  if (typeof window !== 'undefined') {
    import('pdfjs-dist').then(async (module) => {
      pdfjsLib = module;
      // Vite에서 PDF.js 워커 설정
      const workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc.default;
    }).catch(err => {
      console.error('PDF.js 로드 오류:', err);
    });
  }
  
  // 블록 타입과 색상 정의 (통일된 색상 스킴)
  const blockTypes = [
    { value: 'question', label: '문제', icon: '❓', color: 'btn-primary', hexColor: '#3B82F6' },    // Blue
    { value: 'passage', label: '지문', icon: '📜', color: 'btn-warning', hexColor: '#F59E0B' },    // Amber
    { value: 'concept', label: '개념', icon: '💡', color: 'btn-secondary', hexColor: '#8B5CF6' },  // Violet
    { value: 'explanation', label: '해설', icon: '📝', color: 'btn-success', hexColor: '#10B981' }  // Emerald
  ];
  
  // 블록 타입별 색상 매핑
  const blockColors = blockTypes.reduce((acc, type) => {
    acc[type.value] = type.hexColor;
    return acc;
  }, {});
  
  // 블록 타입별 카운터
  let blockCounters = {
    question: 0,
    passage: 0,
    concept: 0,
    explanation: 0
  };
  
  // 선택된 블록들 (체크박스)
  let checkedBlocks = new Set();
  
  // 전체 선택 체크박스 상태를 위한 reactive 변수
  $: allChecked = selectedBlocks.length > 0 && checkedBlocks.size === selectedBlocks.length;
  $: someChecked = checkedBlocks.size > 0 && checkedBlocks.size < selectedBlocks.length;
  
  // 키보드 제어를 위한 변수
  let selectedRowIndex = 0;
  let isEditingCell = false;
  
  // 일괄 작업용 변수
  let bulkType = '';
  let bulkFormat = '';
  let bulkScore = '';
  let bulkDifficulty = '';
  
  // 문항 형식
  const questionFormats = [
    { value: 'ox', label: 'O/X' },
    { value: 'multiple_choice', label: '객관식' },
    { value: 'single_choice', label: '단일 선택' },
    { value: 'short_answer', label: '주관식' },
    { value: 'essay', label: '서술형' }
  ];
  
  // 난이도 태그
  const difficultyTags = [
    { value: 'low', label: '난이도 낮음', color: 'badge-success' },
    { value: 'medium', label: '난이도 중간', color: 'badge-warning' },
    { value: 'high', label: '난이도 높음', color: 'badge-error' }
  ];
  
  onMount(async () => {
    if (browser && $user?.id) {
      await fetchMaterials($user.id, 'original');
      
      // URL 파라미터에서 step과 materialId 확인
      const stepParam = $page.url.searchParams.get('step');
      const materialId = $page.url.searchParams.get('materialId');
      
      if (stepParam) {
        extractionStep = stepParam;
      }
      
      if (materialId) {
        const material = $materials.find(m => m.id === materialId);
        if (material) {
          selectedMaterial = material;
          totalPages = material.pages || 10;
          if (extractionStep === 'select-material') {
            extractionStep = 'extract-blocks';
          }
          await loadFile();
          await loadExistingBlocks();
          await loadTempSavedData();
        }
      }
    }
    
    // 이벤트 리스너 추가
    if (browser) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('popstate', handlePopState);
      
      // 자동 저장 시작 (30초마다)
      startAutoSave();
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
        stopAutoSave();
      };
    }
  });
  
  async function selectMaterial(material) {
    selectedMaterial = material;
    extractionStep = 'extract-blocks';
    totalPages = material.pages || 10;
    
    // 히스토리 업데이트
    updateHistory();
    
    // 파일 로드
    await loadFile();
    
    // 기존 추출된 블록 로드
    await loadExistingBlocks();
    
    // 임시 저장 데이터 확인
    await loadTempSavedData();
  }
  
  // 기존 추출된 블록 로드
  async function loadExistingBlocks() {
    if (!selectedMaterial || !$user?.id) return;
    
    try {
      // Supabase에서 해당 자료의 블록 가져오기
      await fetchBlocks($user.id);
      
      // 현재 자료의 블록만 필터링
      const materialBlocks = $blocks.filter(block => block.material_id === selectedMaterial.id);
      
      if (materialBlocks.length > 0) {
        // 블록 형식 변환
        selectedBlocks = materialBlocks.map(block => {
          // localStorage에서 selection 정보 가져오기
          const savedSelections = JSON.parse(localStorage.getItem(`block-selections-${selectedMaterial.id}`) || '{}');
          const selection = savedSelections[block.id] || { x: 0, y: 0, width: 100, height: 100 };
          
          return {
            id: block.id,
            type: block.type,
            title: block.title || `${block.type} ${block.page_number}`,
            page: block.page_number || 1,
            selection: selection,
            content: block.content || '',
            format: block.subtype || 'multiple_choice',
            answer: block.correct_answer || '',
            tags: block.tags || [],
            linkedBlocks: block.linked_blocks || [],
            extractedText: block.content || '',
            imageData: block.image_data || null,
            score: block.score || 3,
            difficulty: block.difficulty || '',
            customTags: block.custom_tags || [],
            isExisting: true // 기존 블록 표시
          };
        });
        
        // 카운터 업데이트
        blockCounters = {
          question: materialBlocks.filter(b => b.type === 'question').length,
          passage: materialBlocks.filter(b => b.type === 'passage').length,
          concept: materialBlocks.filter(b => b.type === 'concept').length,
          explanation: materialBlocks.filter(b => b.type === 'explanation').length
        };
        
        // 캔버스에 그리기
        setTimeout(() => {
          drawExistingBlocks();
        }, 500);
      }
    } catch (error) {
      console.error('기존 블록 로드 오류:', error);
    }
  }
  
  // 파일 로드 함수
  async function loadFile() {
    if (!selectedMaterial) return;
    
    try {
      isLoading = true;
      
      // Supabase Storage에서 파일 가져오기
      if (selectedMaterial.file_path) {
        const { data } = supabase.storage
          .from('materials-original')
          .getPublicUrl(selectedMaterial.file_path);
        
        if (data?.publicUrl) {
          fileDataUrl = data.publicUrl;
          
          if (selectedMaterial.mime_type === 'application/pdf') {
            await loadPDF(fileDataUrl);
          } else if (selectedMaterial.mime_type?.startsWith('image/')) {
            totalPages = 1;
          }
        }
      }
      isLoading = false;
    } catch (error) {
      console.error('파일 로드 오류:', error);
      isLoading = false;
    }
  }
  
  // PDF 로드 함수
  async function loadPDF(dataUrl) {
    try {
      // PDF.js가 로드될 때까지 대기
      if (!pdfjsLib) {
        await new Promise((resolve) => {
          const checkInterval = setInterval(() => {
            if (pdfjsLib) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
      
      const loadingTask = pdfjsLib.getDocument(dataUrl);
      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;
      selectedMaterial.pages = totalPages;
      
      // canvasContainer가 준비될 때까지 대기
      setTimeout(() => {
        if (canvasContainer) {
          renderPage(currentPage);
        }
      }, 200);
    } catch (error) {
      console.error('PDF 로드 오류:', error);
    }
  }
  
  // 현재 스케일 저장 (줌 변경 시 블록 좌표 조정용)
  let currentScale = 1;
  let baseScale = 1;
  
  // PDF 페이지 렌더링
  async function renderPage(pageNum) {
    if (!pdfDoc || !canvas || !canvasContainer) return;
    
    // 이전 렌더링 태스크 취소
    if (renderTask) {
      try {
        renderTask.cancel();
      } catch (e) {
        // 이미 완료된 태스크인 경우 무시
      }
    }
    
    if (!ctx) {
      ctx = canvas.getContext('2d');
    }
    
    const page = await pdfDoc.getPage(pageNum);
    
    // 컨테이너 너비에 맞춰 초기 스케일 계산
    const containerWidth = canvasContainer.clientWidth - 40; // 패딩 고려
    const defaultViewport = page.getViewport({ scale: 1.0 });
    const fitWidthScale = containerWidth / defaultViewport.width;
    
    // 베이스 스케일 저장 (최초 렌더링 시)
    if (baseScale === 1) {
      baseScale = fitWidthScale;
    }
    
    // 줌 레벨을 적용한 최종 스케일
    const scale = fitWidthScale * zoomLevel;
    currentScale = scale;
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // 오버레이 캔버스도 같은 크기로 설정
    if (overlayCanvas) {
      overlayCanvas.width = viewport.width;
      overlayCanvas.height = viewport.height;
    }
    
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    renderTask = page.render(renderContext);
    await renderTask.promise;
    
    // 기존 블록 영역 표시 (약간의 지연 후)
    setTimeout(() => {
      drawExistingBlocks();
    }, 100);
  }
  
  function handlePageChange(page) {
    currentPage = page;
    if (pdfDoc) {
      renderPage(currentPage).then(() => {
        drawExistingBlocks();
      });
    }
  }
  
  function handleZoomIn() {
    if (zoomLevel < maxZoom) {
      zoomLevel = Math.min(zoomLevel + zoomStep, maxZoom);
      renderPage(currentPage);
    }
  }
  
  function handleZoomOut() {
    if (zoomLevel > minZoom) {
      zoomLevel = Math.max(zoomLevel - zoomStep, minZoom);
      renderPage(currentPage);
    }
  }
  
  function handleZoomReset() {
    zoomLevel = 1;
    renderPage(currentPage);
  }
  
  function setExtractionMode(mode) {
    extractionMode = mode;
  }
  
  async function autoExtractBlocks() {
    if (!pdfDoc) {
      console.error('PDF가 로드되지 않았습니다');
      return;
    }
    
    isExtracting = true;
    const totalBlocksFound = [];
    
    try {
      // 전체 페이지 처리 여부 확인
      const extractAllPages = confirm('전체 페이지에서 문항을 추출하시겠습니까?\n(취소를 누르면 현재 페이지만 추출합니다)');
      
      const startPage = extractAllPages ? 1 : currentPage;
      const endPage = extractAllPages ? totalPages : currentPage;
      
      // 진행 상황 표시를 위한 변수
      let processedPages = 0;
      const totalPagesToProcess = endPage - startPage + 1;
      
      // 각 페이지별로 처리
      for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
        processedPages++;
        console.log(`${processedPages}/${totalPagesToProcess} 페이지 처리 중...`);
        
        // 현재 페이지가 아니면 렌더링
        if (pageNum !== currentPage) {
          await renderPage(pageNum);
          // 렌더링 완료 대기 (더 짧게)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!ctx || !canvas) continue;
        
        // 해당 페이지의 이미지 데이터 가져오기
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // 문항 패턴 찾기 (비동기로 처리)
        const questionAreas = await new Promise(resolve => {
          // 다음 틱에서 처리하여 UI 블로킹 방지
          setTimeout(() => {
            const areas = detectQuestionPatterns(imageData, canvas.width, canvas.height);
            resolve(areas);
          }, 0);
        });
        
        console.log(`${pageNum}페이지에서 ${questionAreas.length}개의 문항 영역을 찾았습니다`);
        
        // 찾은 영역들로 블록 생성
        questionAreas.forEach((area, index) => {
          // 현재 스케일 비율을 반영하여 블록 좌표를 베이스 스케일로 정규화
          const scaleRatio = currentScale / baseScale;
          const normalizedSelection = {
            x: area.x / scaleRatio,
            y: area.y / scaleRatio,
            width: area.width / scaleRatio,
            height: area.height / scaleRatio
          };
          
          // 영역의 이미지 캡처
          const capturedImage = captureCanvasArea(area);
          
          // 블록 타입별 카운터 업데이트
          blockCounters.question++;
          
          const newBlock = {
            id: generateUUID(),
            type: 'question',
            title: `문제 ${blockCounters.question}`,
            page: pageNum,
            selection: normalizedSelection,
            content: '',
            format: 'multiple_choice',
            answer: '',
            tags: [],
            linkedBlocks: [],
            extractedText: '',
            imageData: capturedImage,
            score: 3,
            difficulty: '',
            customTags: []
          };
          
          totalBlocksFound.push(newBlock);
        });
      }
      
      // 모든 블록을 한 번에 추가
      selectedBlocks = [...selectedBlocks, ...totalBlocksFound];
      
      // 원래 페이지로 돌아가기
      if (extractAllPages && currentPage !== endPage) {
        await renderPage(currentPage);
      }
      
      // 블록 영역 표시
      drawExistingBlocks();
      
      // selection 정보 저장
      saveSelections();
      
      // 자동 저장
      autoSaveBlocks();
      
      alert(`총 ${totalBlocksFound.length}개의 문항을 찾았습니다.`);
      
    } catch (error) {
      console.error('자동 추출 오류:', error);
    } finally {
      isExtracting = false;
    }
  }
  
  // 문항 패턴 감지 함수 (레이아웃 분석 기반)
  function detectQuestionPatterns(imageData, width, height) {
    const areas = [];
    const data = imageData.data;
    
    // 배경색 찾기 (가장 많은 색상)
    const backgroundColor = findMostFrequentColor(data);
    
    // 각 행의 콘텐츠 밀도 계산
    const rowDensities = calculateRowDensities(data, width, height, backgroundColor);
    
    // 레이아웃 타입 감지 (1열 또는 2열)
    const layoutType = detectLayoutType(data, width, height, backgroundColor);
    console.log(`감지된 레이아웃: ${layoutType}`);
    
    // 상단 헤더 영역 찾기 (보통 첫 10-15%)
    const headerEnd = findHeaderEnd(rowDensities, height);
    
    // 레이아웃에 따라 다른 전략 사용
    if (layoutType === '2-column') {
      return detectTwoColumnQuestions(data, width, height, backgroundColor, rowDensities, headerEnd);
    }
    
    // 기본은 1열 레이아웃으로 처리
    // 콘텐츠가 시작하는 행 찾기
    const contentStarts = findContentStarts(rowDensities, headerEnd);
    
    // 각 시작점에서 문항 영역 추정
    for (let i = 0; i < contentStarts.length; i++) {
      const startY = contentStarts[i];
      let endY = contentStarts[i + 1] || height;
      
      // 실제 콘텐츠가 끝나는 지점 찾기 (아래에서 위로 스캔)
      let actualEndY = endY;
      for (let y = endY - 1; y > startY + 50; y--) {
        if (rowDensities[y] > 10) {
          actualEndY = y + 10; // 약간의 여백 추가
          break;
        }
      }
      endY = Math.min(endY, actualEndY);
      
      // 최소 높이 체크 (80px 이상)
      if (endY - startY < 80) continue;
      
      // 왼쪽 여백과 오른쪽 여백 찾기
      const bounds = findHorizontalBounds(data, width, startY, endY, backgroundColor);
      
      // 유효한 영역인지 확인
      if (bounds.right - bounds.left > 100) {
        // 빈 공간 분석으로 문항 분할
        const midEmptyRows = findMidEmptyRows(rowDensities, startY, endY);
        
        if (midEmptyRows.length > 0) {
          // 큰 빈 공간들을 기준으로 영역 분할
          let currentStart = startY;
          
          for (const empty of midEmptyRows) {
            // 빈 공간 전까지를 하나의 문항으로
            if (empty.position - currentStart > 50) { // 최소 높이 체크
              // 타이트한 경계 찾기
              const tightBounds = findTightBounds(rowDensities, currentStart, empty.position);
              if (tightBounds.bottom - tightBounds.top > 30) {
                areas.push({
                  x: bounds.left,
                  y: tightBounds.top,
                  width: bounds.right - bounds.left,
                  height: tightBounds.bottom - tightBounds.top
                });
              }
            }
            
            // 다음 문항의 시작점은 빈 공간 이후
            currentStart = empty.position + empty.size;
          }
          
          // 마지막 남은 부분 처리
          if (endY - currentStart > 50) {
            const tightBounds = findTightBounds(rowDensities, currentStart, endY);
            if (tightBounds.bottom - tightBounds.top > 30) {
              areas.push({
                x: bounds.left,
                y: tightBounds.top,
                width: bounds.right - bounds.left,
                height: tightBounds.bottom - tightBounds.top
              });
            }
          }
        } else {
          // 빈 공간이 없으면 전체 영역에서 타이트한 경계 찾기
          const tightBounds = findTightBounds(rowDensities, startY, endY);
          if (tightBounds.bottom - tightBounds.top > 30) {
            areas.push({
              x: bounds.left,
              y: tightBounds.top,
              width: bounds.right - bounds.left,
              height: tightBounds.bottom - tightBounds.top
            });
          }
        }
      }
    }
    
    return areas;
  }
  
  // 중간에 있는 큰 빈 공간 찾기 (개선된 버전)
  function findMidEmptyRows(densities, startY, endY) {
    const emptySpaces = [];
    const threshold = 5; // 적절한 민감도
    const pageHeight = densities.length;
    // 페이지 높이에 비례한 최소 빈 공간 크기 (2% ~ 4%)
    const minEmptySize = Math.max(25, Math.min(60, Math.floor(pageHeight * 0.025)));
    
    let emptyStart = -1;
    let emptyCount = 0;
    
    // 시작과 끝 부분을 제외하고 스캔 (전체 영역의 10% 제외)
    const scanStart = startY + Math.floor((endY - startY) * 0.1);
    const scanEnd = endY - Math.floor((endY - startY) * 0.1);
    
    for (let y = scanStart; y < scanEnd; y++) {
      if (densities[y] < threshold) {
        if (emptyStart === -1) {
          emptyStart = y;
        }
        emptyCount++;
      } else {
        if (emptyCount > minEmptySize) {
          // 빈 공간의 시작점을 저장 (중간이 아닌 시작점)
          emptySpaces.push({
            position: emptyStart,
            size: emptyCount
          });
        }
        emptyStart = -1;
        emptyCount = 0;
      }
    }
    
    // 마지막 빈 공간 체크
    if (emptyCount > minEmptySize) {
      emptySpaces.push({
        position: emptyStart,
        size: emptyCount
      });
    }
    
    return emptySpaces;
  }
  
  // 타이트한 경계 찾기 (수동 지정처럼 깔끔하게)
  function findTightBounds(densities, startY, endY) {
    const threshold = 8; // 콘텐츠 판단 임계값
    const padding = 8; // 여백
    
    // 위에서부터 실제 콘텐츠 시작점 찾기
    let actualTop = startY;
    for (let y = startY; y < endY; y++) {
      if (densities[y] >= threshold) {
        actualTop = Math.max(startY, y - padding);
        break;
      }
    }
    
    // 아래에서부터 실제 콘텐츠 끝점 찾기
    let actualBottom = endY;
    for (let y = endY - 1; y >= startY; y--) {
      if (densities[y] >= threshold) {
        actualBottom = Math.min(endY, y + padding);
        break;
      }
    }
    
    return {
      top: actualTop,
      bottom: actualBottom
    };
  }
  
  // 레이아웃 타입 감지 (1열 또는 2열)
  function detectLayoutType(data, width, height, bgColor) {
    // 중앙 부분의 수직선 감지로 2열 레이아웃 확인
    const centerX = Math.floor(width / 2);
    const tolerance = 50; // 중앙에서 ±50px 범위
    let verticalLineScore = 0;
    
    // 페이지 중간 부분 스캔 (상하 20% 제외)
    const scanStart = Math.floor(height * 0.2);
    const scanEnd = Math.floor(height * 0.8);
    
    for (let x = centerX - tolerance; x <= centerX + tolerance; x++) {
      let emptyPixels = 0;
      for (let y = scanStart; y < scanEnd; y += 10) {
        const idx = (y * width + x) * 4;
        if (isBackgroundPixel(data[idx], data[idx+1], data[idx+2], bgColor)) {
          emptyPixels++;
        }
      }
      // 해당 열이 대부분 비어있으면 수직 구분선으로 간주
      if (emptyPixels > (scanEnd - scanStart) / 10 * 0.8) {
        verticalLineScore++;
      }
    }
    
    // 중앙에 수직 빈 공간이 충분히 있으면 2열 레이아웃
    return verticalLineScore > tolerance ? '2-column' : '1-column';
  }
  
  // 상단 헤더 영역 끝 찾기
  function findHeaderEnd(densities, height) {
    // 상단 15% 이내에서 큰 빈 공간 찾기
    const headerLimit = Math.floor(height * 0.15);
    let emptyCount = 0;
    
    for (let y = 0; y < headerLimit; y++) {
      if (densities[y] < 5) {
        emptyCount++;
        // 연속된 빈 공간이 20px 이상이면 헤더 끝으로 간주
        if (emptyCount > 20) {
          return y;
        }
      } else {
        emptyCount = 0;
      }
    }
    
    return 0; // 헤더가 없으면 0
  }
  
  // 배경 픽셀인지 확인
  function isBackgroundPixel(r, g, b, bgColor) {
    const tolerance = 30;
    return Math.abs(r - bgColor[0]) <= tolerance && 
           Math.abs(g - bgColor[1]) <= tolerance && 
           Math.abs(b - bgColor[2]) <= tolerance;
  }
  
  // 2열 레이아웃 문항 감지
  function detectTwoColumnQuestions(data, width, height, bgColor, densities, headerEnd) {
    const areas = [];
    const centerX = Math.floor(width / 2);
    
    // 왼쪽 열 처리
    const leftBounds = { left: 20, right: centerX - 20 };
    const leftAreas = detectSingleColumnQuestions(data, width, height, bgColor, densities, headerEnd, leftBounds);
    
    // 오른쪽 열 처리
    const rightBounds = { left: centerX + 20, right: width - 20 };
    const rightAreas = detectSingleColumnQuestions(data, width, height, bgColor, densities, headerEnd, rightBounds);
    
    return [...leftAreas, ...rightAreas];
  }
  
  // 단일 열에서 문항 감지 (공통 로직)
  function detectSingleColumnQuestions(data, width, height, bgColor, densities, startY, columnBounds) {
    const areas = [];
    const contentStarts = findContentStarts(densities, startY);
    
    for (let i = 0; i < contentStarts.length; i++) {
      const startY = contentStarts[i];
      let endY = contentStarts[i + 1] || height;
      
      // 실제 콘텐츠가 끝나는 지점 찾기
      let actualEndY = endY;
      for (let y = endY - 1; y > startY + 50; y--) {
        if (densities[y] > 10) {
          actualEndY = y + 10;
          break;
        }
      }
      endY = Math.min(endY, actualEndY);
      
      if (endY - startY < 50) continue;
      
      // 타이트한 경계 찾기
      const tightBounds = findTightBounds(densities, startY, endY);
      
      if (tightBounds.bottom - tightBounds.top > 30) {
        areas.push({
          x: columnBounds.left,
          y: tightBounds.top,
          width: columnBounds.right - columnBounds.left,
          height: tightBounds.bottom - tightBounds.top
        });
      }
    }
    
    return areas;
  }
  
  // 가장 많이 나타나는 색상 찾기 (배경색)
  function findMostFrequentColor(data) {
    const colorCount = new Map();
    const sampleRate = 100; // 성능을 위해 100픽셀마다 샘플링
    
    for (let i = 0; i < data.length; i += 4 * sampleRate) {
      const r = Math.round(data[i] / 10) * 10;
      const g = Math.round(data[i + 1] / 10) * 10;
      const b = Math.round(data[i + 2] / 10) * 10;
      const colorStr = `${r},${g},${b}`;
      colorCount.set(colorStr, (colorCount.get(colorStr) || 0) + 1);
    }
    
    let maxColor = '250,250,250'; // 기본값 (흰색)
    let maxCount = 0;
    for (const [color, count] of colorCount) {
      if (count > maxCount) {
        maxCount = count;
        maxColor = color;
      }
    }
    
    return maxColor.split(',').map(Number);
  }
  
  // 각 행의 콘텐츠 밀도 계산 (최적화된 버전)
  function calculateRowDensities(data, width, height, bgColor) {
    const densities = new Float32Array(height);
    const tolerance = 30;
    const sampleStep = 10; // 더 큰 샘플링 간격
    
    // 배경색 RGB 값을 미리 계산
    const bgR = bgColor[0];
    const bgG = bgColor[1];
    const bgB = bgColor[2];
    
    // 각 행을 병렬적으로 처리할 수 있도록 준비
    for (let y = 0; y < height; y++) {
      let contentPixels = 0;
      const rowStart = y * width * 4;
      
      // 샘플링하여 성능 향상
      for (let x = 0; x < width; x += sampleStep) {
        const idx = rowStart + (x * 4);
        
        // 배경색과의 차이를 빠르게 계산
        if (Math.abs(data[idx] - bgR) > tolerance || 
            Math.abs(data[idx + 1] - bgG) > tolerance || 
            Math.abs(data[idx + 2] - bgB) > tolerance) {
          contentPixels++;
        }
      }
      
      densities[y] = contentPixels;
    }
    
    return densities;
  }
  
  // 콘텐츠 시작 지점 찾기 (개선된 버전)
  function findContentStarts(densities, startFromY = 0) {
    const starts = [];
    const threshold = 10; // 최소 콘텐츠 픽셀 수
    const pageHeight = densities.length;
    
    // 페이지 높이에 따른 동적 임계값
    const emptyRowsThreshold = Math.max(20, Math.min(60, Math.floor(pageHeight * 0.025)));
    
    // 연속된 콘텐츠 영역 찾기
    let inContent = false;
    let emptyRowCount = 0;
    let contentStarted = -1;
    
    for (let i = startFromY; i < densities.length; i++) {
      const hasContent = densities[i] >= threshold;
      
      if (hasContent) {
        if (!inContent) {
          // 새로운 콘텐츠 영역 시작
          if (emptyRowCount > emptyRowsThreshold || i === 0) {
            contentStarted = i;
            inContent = true;
            starts.push(i);
          }
        }
        emptyRowCount = 0;
      } else {
        emptyRowCount++;
        
        // 긴 빈 공간이 나타나면 콘텐츠 영역 종료
        if (inContent && emptyRowCount > emptyRowsThreshold * 0.5) {
          inContent = false;
        }
      }
    }
    
    // 시작점이 너무 많으면 필터링 (너무 가까운 것들 제거)
    const filteredStarts = [];
    for (let i = 0; i < starts.length; i++) {
      if (i === 0 || starts[i] - starts[i-1] > emptyRowsThreshold * 2) {
        filteredStarts.push(starts[i]);
      }
    }
    
    return filteredStarts;
  }
  
  // 수평 경계 찾기
  function findHorizontalBounds(data, width, startY, endY, bgColor) {
    const tolerance = 30;
    let left = width;
    let right = 0;
    
    // 영역 내에서 가장 왼쪽과 오른쪽 콘텐츠 픽셀 찾기
    for (let y = startY; y < Math.min(endY, startY + 200); y += 5) { // 상단 200px만 확인
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        
        if (Math.abs(r - bgColor[0]) > tolerance || 
            Math.abs(g - bgColor[1]) > tolerance || 
            Math.abs(b - bgColor[2]) > tolerance) {
          left = Math.min(left, x);
          right = Math.max(right, x);
        }
      }
    }
    
    // 여백 추가
    const padding = 20;
    return {
      left: Math.max(0, left - padding),
      right: Math.min(width, right + padding)
    };
  }
  
  // 영역 선택 모드 토글
  function toggleSelection() {
    isSelecting = !isSelecting;
  }
  
  // 리사이징 핸들 위에 있는지 확인
  function isCheckingResize(e) {
    if (!canvas) return false;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const scaleRatio = currentScale / baseScale;
    
    for (const block of selectedBlocks) {
      if (block.page === currentPage && block.selection) {
        const scaledX = block.selection.x * scaleRatio;
        const scaledY = block.selection.y * scaleRatio;
        const scaledWidth = block.selection.width * scaleRatio;
        const scaledHeight = block.selection.height * scaleRatio;
        
        const handleSize = 8;
        const handles = [
          { x: scaledX, y: scaledY },
          { x: scaledX + scaledWidth - handleSize, y: scaledY },
          { x: scaledX, y: scaledY + scaledHeight - handleSize },
          { x: scaledX + scaledWidth - handleSize, y: scaledY + scaledHeight - handleSize }
        ];
        
        for (const handle of handles) {
          if (mouseX >= handle.x && mouseX <= handle.x + handleSize &&
              mouseY >= handle.y && mouseY <= handle.y + handleSize) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  // 마우스 이벤트 핸들러
  function handleMouseDown(e) {
    if (!canvas) return;
    
    // 자동 추출 모드에서는 리사이징만 가능
    if (extractionMode === 'auto' && !isCheckingResize(e)) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    // 리사이즈 핸들 클릭 검사 (모든 블록 대상)
    const scaleRatio = currentScale / baseScale;
    for (const block of selectedBlocks) {
      if (block.page === currentPage && block.selection) {
        const scaledX = block.selection.x * scaleRatio;
        const scaledY = block.selection.y * scaleRatio;
        const scaledWidth = block.selection.width * scaleRatio;
        const scaledHeight = block.selection.height * scaleRatio;
        
        const handleSize = 8;
        const handles = [
          { x: scaledX, y: scaledY, type: 'nw' },
          { x: scaledX + scaledWidth - handleSize, y: scaledY, type: 'ne' },
          { x: scaledX, y: scaledY + scaledHeight - handleSize, type: 'sw' },
          { x: scaledX + scaledWidth - handleSize, y: scaledY + scaledHeight - handleSize, type: 'se' }
        ];
        
        for (const handle of handles) {
          if (mouseX >= handle.x && mouseX <= handle.x + handleSize &&
              mouseY >= handle.y && mouseY <= handle.y + handleSize) {
            isResizing = true;
            resizingBlock = block;
            resizeHandle = handle.type;
            resizeStartPos = { x: mouseX, y: mouseY };
            originalSelection = { ...block.selection };
            e.preventDefault();
            return;
          }
        }
      }
    }
    
    // 수동 모드에서만 새 선택 시작
    if (extractionMode === 'manual') {
      selectionStart = {
        x: mouseX,
        y: mouseY
      };
      
      selectionRect = {
        x: selectionStart.x,
        y: selectionStart.y,
        width: 0,
        height: 0
      };
    }
  }
  
  function handleMouseMove(e) {
    if (!canvas) return;
    
    // 자동 추출 모드에서는 리사이징만 처리
    if (extractionMode === 'auto' && !isResizing) {
      updateCursor((e.clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width),
                   (e.clientY - canvas.getBoundingClientRect().top) * (canvas.height / canvas.getBoundingClientRect().height));
      return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    // 리사이징 처리
    if (isResizing && resizingBlock && resizeStartPos && originalSelection) {
      const scaleRatio = currentScale / baseScale;
      const deltaX = (currentX - resizeStartPos.x) / scaleRatio;
      const deltaY = (currentY - resizeStartPos.y) / scaleRatio;
      
      const newSelection = { ...originalSelection };
      
      switch (resizeHandle) {
        case 'nw':
          newSelection.x = originalSelection.x + deltaX;
          newSelection.y = originalSelection.y + deltaY;
          newSelection.width = originalSelection.width - deltaX;
          newSelection.height = originalSelection.height - deltaY;
          break;
        case 'ne':
          newSelection.y = originalSelection.y + deltaY;
          newSelection.width = originalSelection.width + deltaX;
          newSelection.height = originalSelection.height - deltaY;
          break;
        case 'sw':
          newSelection.x = originalSelection.x + deltaX;
          newSelection.width = originalSelection.width - deltaX;
          newSelection.height = originalSelection.height + deltaY;
          break;
        case 'se':
          newSelection.width = originalSelection.width + deltaX;
          newSelection.height = originalSelection.height + deltaY;
          break;
      }
      
      // 최소 크기 제한
      if (newSelection.width > 20 && newSelection.height > 20) {
        resizingBlock.selection = newSelection;
        drawExistingBlocks();
      }
      return;
    }
    
    // 새 선택 영역 그리기
    if (selectionStart) {
      selectionRect = {
        x: Math.min(selectionStart.x, currentX),
        y: Math.min(selectionStart.y, currentY),
        width: Math.abs(currentX - selectionStart.x),
        height: Math.abs(currentY - selectionStart.y)
      };
      
      // 오버레이 캔버스에만 선택 영역 그리기
      drawSelectionOverlay();
    }
    
    // 커서 업데이트
    updateCursor(currentX, currentY);
  }
  
  function handleMouseUp(e) {
    if (!canvas) return;
    
    // 리사이징 종료 - 자동 조정 없이 그대로 저장
    if (isResizing) {
      isResizing = false;
      resizingBlock = null;
      resizeHandle = null;
      resizeStartPos = null;
      originalSelection = null;
      // 리사이즈 후 selection 저장
      saveSelections();
      return;
    }
    
    // 수동 모드에서만 새 선택 영역 처리 - 자동 조정 적용
    if (extractionMode === 'manual' && selectionStart && selectionRect) {
      if (selectionRect.width > 10 && selectionRect.height > 10) {
        // 자동 경계 조정 적용
        const adjustedRect = findContentBoundaries(
          selectionRect.x, 
          selectionRect.y, 
          selectionRect.width, 
          selectionRect.height
        );
        
        // 조정된 영역으로 블록 생성
        createBlockFromSelection(adjustedRect);
      }
    }
    
    // 선택 모드 종료
    isSelecting = false;
    selectionStart = null;
    selectionRect = null;
    clearSelectionOverlay();
  }
  
  // 커서 업데이트 함수
  function updateCursor(x, y) {
    if (!overlayCanvas) return;
    
    const scaleRatio = currentScale / baseScale;
    let cursorSet = false;
    let newHoveredBlockId = null;
    
    for (const block of selectedBlocks) {
      if (block.page === currentPage && block.selection) {
        const scaledX = block.selection.x * scaleRatio;
        const scaledY = block.selection.y * scaleRatio;
        const scaledWidth = block.selection.width * scaleRatio;
        const scaledHeight = block.selection.height * scaleRatio;
        
        const handleSize = 8;
        const handles = [
          { x: scaledX, y: scaledY, cursor: 'nw-resize' },
          { x: scaledX + scaledWidth - handleSize, y: scaledY, cursor: 'ne-resize' },
          { x: scaledX, y: scaledY + scaledHeight - handleSize, cursor: 'sw-resize' },
          { x: scaledX + scaledWidth - handleSize, y: scaledY + scaledHeight - handleSize, cursor: 'se-resize' }
        ];
        
        for (const handle of handles) {
          if (x >= handle.x && x <= handle.x + handleSize &&
              y >= handle.y && y <= handle.y + handleSize) {
            overlayCanvas.style.cursor = handle.cursor;
            newHoveredBlockId = block.id;
            cursorSet = true;
            break;
          }
        }
        if (cursorSet) break;
      }
    }
    
    // 호버 상태 업데이트
    if (hoveredBlockId !== newHoveredBlockId) {
      hoveredBlockId = newHoveredBlockId;
      // 선택 중이 아닐 때만 다시 그리기
      if (!selectionStart) {
        drawExistingBlocks();
      }
    }
    
    if (!cursorSet) {
      overlayCanvas.style.cursor = 'crosshair';
    }
  }
  
  // 자동 저장 기능
  function startAutoSave() {
    autoSaveInterval = setInterval(() => {
      if (selectedBlocks.length > 0 && selectedMaterial) {
        autoSaveBlocks();
      }
    }, 30000); // 30초마다
  }
  
  function stopAutoSave() {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
      autoSaveInterval = null;
    }
  }
  
  async function autoSaveBlocks() {
    if (isSaving || !selectedMaterial) return;
    
    try {
      isSaving = true;
      const tempData = {
        materialId: selectedMaterial.id,
        blocks: selectedBlocks,
        timestamp: new Date().toISOString()
      };
      
      // localStorage에 임시 저장
      localStorage.setItem(`extract-temp-${selectedMaterial.id}`, JSON.stringify(tempData));
      lastSavedTime = new Date();
      
      console.log('임시 저장 완료:', lastSavedTime);
    } catch (error) {
      console.error('임시 저장 오류:', error);
    } finally {
      isSaving = false;
    }
  }
  
  // 임시 저장된 데이터 로드
  async function loadTempSavedData() {
    if (!selectedMaterial) return;
    
    try {
      const tempData = localStorage.getItem(`extract-temp-${selectedMaterial.id}`);
      if (tempData) {
        const parsed = JSON.parse(tempData);
        if (parsed.blocks && parsed.blocks.length > 0) {
          const shouldLoad = confirm('임시 저장된 데이터가 있습니다. 불러오시겠습니까?');
          if (shouldLoad) {
            selectedBlocks = parsed.blocks;
            drawExistingBlocks();
          }
        }
      }
    } catch (error) {
      console.error('임시 데이터 로드 오류:', error);
    }
  }
  
  // selection 정보 저장
  function saveSelections() {
    if (!selectedMaterial) return;
    
    const selections = {};
    selectedBlocks.forEach(block => {
      if (block.selection) {
        selections[block.id] = block.selection;
      }
    });
    
    localStorage.setItem(`block-selections-${selectedMaterial.id}`, JSON.stringify(selections));
  }
  
  // 콘텐츠 경계 자동 감지 함수
  function findContentBoundaries(x, y, width, height) {
    if (!ctx || !canvas) return { x, y, width, height };
    
    try {
      // 선택 영역의 이미지 데이터 가져오기
      const imageData = ctx.getImageData(x, y, width, height);
      const data = imageData.data;
      const padding = 10; // 최소 여백
      
      // 색상을 문자열로 변환하는 함수 (비교를 위해)
      function colorToString(r, g, b) {
        // 10단위로 반올림하여 유사한 색상을 그룹화
        const roundedR = Math.round(r / 10) * 10;
        const roundedG = Math.round(g / 10) * 10;
        const roundedB = Math.round(b / 10) * 10;
        return `${roundedR},${roundedG},${roundedB}`;
      }
      
      // 가장 많이 나타나는 색상 찾기 (배경색으로 간주)
      const colorCount = new Map();
      const sampleRate = 10; // 성능을 위해 10픽셀마다 샘플링
      
      for (let i = 0; i < data.length; i += 4 * sampleRate) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const colorStr = colorToString(r, g, b);
        colorCount.set(colorStr, (colorCount.get(colorStr) || 0) + 1);
      }
      
      // 가장 많이 나타나는 색상을 배경색으로 설정
      let backgroundColor = '';
      let maxCount = 0;
      for (const [color, count] of colorCount) {
        if (count > maxCount) {
          maxCount = count;
          backgroundColor = color;
        }
      }
      
      const [bgR, bgG, bgB] = backgroundColor.split(',').map(Number);
      console.log('감지된 배경색:', backgroundColor);
      
      // 픽셀이 배경인지 확인하는 함수
      function isBackground(r, g, b) {
        // 배경색과의 차이가 30 이내면 배경으로 간주
        const tolerance = 30;
        return Math.abs(r - bgR) <= tolerance && 
               Math.abs(g - bgG) <= tolerance && 
               Math.abs(b - bgB) <= tolerance;
      }
      
      // 상하좌우 가장 끝에 있는 콘텐츠 픽셀 찾기
      let top = height - 1;
      let bottom = 0;
      let left = width - 1;
      let right = 0;
      
      // 모든 픽셀을 스캔하여 콘텐츠가 있는 가장 끝 위치 찾기
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const idx = (row * width + col) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          if (!isBackground(r, g, b)) {
            // 콘텐츠 픽셀을 찾았을 때 경계 업데이트
            top = Math.min(top, row);
            bottom = Math.max(bottom, row);
            left = Math.min(left, col);
            right = Math.max(right, col);
          }
        }
      }
      
      // 콘텐츠를 찾지 못한 경우 원본 반환
      if (top > bottom || left > right) {
        console.log('콘텐츠를 찾지 못함');
        return { x, y, width, height };
      }
      
      // 여백 추가
      top = Math.max(0, top - padding);
      bottom = Math.min(height - 1, bottom + padding);
      left = Math.max(0, left - padding);
      right = Math.min(width - 1, right + padding);
      
      // 조정된 영역이 너무 작지 않도록 최소 크기 보장
      const adjustedWidth = right - left + 1;
      const adjustedHeight = bottom - top + 1;
      
      // 원본 대비 너무 작게 줄어들었는지 확인
      const widthRatio = adjustedWidth / width;
      const heightRatio = adjustedHeight / height;
      
      // 원본의 30% 미만으로 줄어들었으면 원본 크기 유지
      if (widthRatio < 0.3 || heightRatio < 0.3) {
        console.log('조정된 영역이 너무 작아 원본 크기 유지');
        return { x, y, width, height };
      }
      
      console.log(`경계 조정: top=${top}, bottom=${bottom}, left=${left}, right=${right}`);
      console.log(`원본: ${width}x${height}, 조정 후: ${adjustedWidth}x${adjustedHeight}`);
      
      return {
        x: x + left,
        y: y + top,
        width: adjustedWidth,
        height: adjustedHeight
      };
    } catch (error) {
      console.error('콘텐츠 경계 감지 오류:', error);
      return { x, y, width, height };
    }
  }
  
  function createBlockFromSelection(adjustedRect = null) {
    // adjustedRect가 제공되면 사용, 아니면 기존 selectionRect 사용
    const rectToUse = adjustedRect || selectionRect;
    if (!rectToUse || !canvas) return;
    
    // 선택된 영역의 이미지 캡처
    const imageData = captureCanvasArea(rectToUse);
    
    // 기본 타입은 문제
    const defaultType = 'question';
    blockCounters[defaultType]++;
    
    const typeInfo = blockTypes.find(t => t.value === defaultType);
    const title = `${typeInfo.label} ${blockCounters[defaultType]}`;
    
    // 현재 스케일 비율을 반영하여 블록 좌표를 베이스 스케일로 정규화
    const scaleRatio = currentScale / baseScale;
    const normalizedSelection = {
      x: rectToUse.x / scaleRatio,
      y: rectToUse.y / scaleRatio,
      width: rectToUse.width / scaleRatio,
      height: rectToUse.height / scaleRatio
    };
    
    const newBlock = {
      id: generateUUID(),
      type: defaultType,
      title: title,
      page: currentPage,
      selection: normalizedSelection, // 정규화된 좌표 저장
      content: '',
      format: 'multiple_choice',
      answer: '',
      tags: [], // 빈 배열로 초기화
      linkedBlocks: [],
      extractedText: '',
      imageData: imageData, // 캡처된 이미지 저장
      score: 3, // 기본 배점
      difficulty: '', // 난이도
      customTags: [] // 커스텀 태그
    };
    
    selectedBlocks = [...selectedBlocks, newBlock];
    nextBlockId++;
    
    // 블록 영역 표시 (약간의 지연 후)
    setTimeout(() => {
      drawExistingBlocks();
    }, 50);
    
    // selection 정보 저장
    saveSelections();
    
    // 자동 저장
    autoSaveBlocks();
  }
  
  // 블록 타입 변경 시 제목 업데이트
  function updateBlockType(blockId, newType) {
    selectedBlocks = selectedBlocks.map(block => {
      if (block.id === blockId) {
        const updatedBlock = { ...block, type: newType };
        // 문제로 변경할 때 연결된 블록 초기화
        if (newType === 'question') {
          updatedBlock.linkedBlocks = [];
        }
        return updatedBlock;
      }
      return block;
    });
    
    // 모든 블록의 번호를 재계산
    recalculateBlockNumbers();
    
    // 블록 영역 다시 표시
    drawExistingBlocks();
  }
  
  // 블록 번호 재계산 함수
  function recalculateBlockNumbers() {
    // 각 타입별 카운터 초기화
    const tempCounters = {
      question: 0,
      passage: 0,
      concept: 0,
      explanation: 0
    };
    
    // 모든 블록을 순회하며 번호 재할당
    selectedBlocks.forEach(block => {
      tempCounters[block.type]++;
      const typeInfo = blockTypes.find(t => t.value === block.type);
      block.title = `${typeInfo.label} ${tempCounters[block.type]}`;
    });
    
    // 전역 카운터 업데이트
    blockCounters = tempCounters;
  }
  
  function captureCanvasArea(rect) {
    if (!canvas || !ctx) return null;
    
    // 고해상도를 위한 스케일 팩터
    const scaleFactor = 2; // 2배 해상도
    
    // 임시 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width * scaleFactor;
    tempCanvas.height = rect.height * scaleFactor;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 고품질 렌더링 설정
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    
    // 스케일 적용
    tempCtx.scale(scaleFactor, scaleFactor);
    
    // 선택 영역 복사
    tempCtx.drawImage(
      canvas,
      rect.x, rect.y, rect.width, rect.height,
      0, 0, rect.width, rect.height
    );
    
    // 높은 품질로 base64 변환
    return tempCanvas.toDataURL('image/jpeg', 0.95);
  }
  
  function drawSelectionOverlay() {
    if (!overlayCtx || !overlayCanvas) return;
    
    // 오버레이 캔버스 클리어
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // 기존 블록들 그리기 (drawBlocks를 호출)
    drawBlocks();
    
    // 선택 영역 그리기
    if (selectionRect && selectionStart) {
      overlayCtx.save();
      overlayCtx.strokeStyle = '#3B82F6';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([5, 5]);
      overlayCtx.strokeRect(
        selectionRect.x,
        selectionRect.y,
        selectionRect.width,
        selectionRect.height
      );
      overlayCtx.restore();
    }
  }
  
  function clearSelectionOverlay() {
    if (!overlayCtx || !overlayCanvas) return;
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    // 선택이 끝난 후 기존 블록들 다시 그리기
    drawBlocks();
  }
  
  function drawSelectionRect() {
    if (!overlayCtx || !selectionRect) return;
    
    overlayCtx.save();
    overlayCtx.strokeStyle = '#3B82F6';
    overlayCtx.lineWidth = 2;
    overlayCtx.setLineDash([5, 5]);
    overlayCtx.strokeRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
    overlayCtx.restore();
  }
  
  // 블록만 그리는 함수 (선택 영역 제외)
  function drawBlocks() {
    if (!overlayCtx || !overlayCanvas) return;
    
    // 스케일 비율 계산 (현재 스케일 / 블록 생성 시 스케일)
    const scaleRatio = currentScale / baseScale;
    
    // 선택된 블록들 그리기
    selectedBlocks.forEach(block => {
      if (block.page === currentPage && block.selection) {
        overlayCtx.save();
        
        // 블록 타입에 따른 색상 설정
        const color = blockColors[block.type] || '#3B82F6';
        
        // 스케일된 좌표 계산
        const scaledX = block.selection.x * scaleRatio;
        const scaledY = block.selection.y * scaleRatio;
        const scaledWidth = block.selection.width * scaleRatio;
        const scaledHeight = block.selection.height * scaleRatio;
        
        // 체크된 블록은 더 진하게 표시
        if (checkedBlocks.has(block.id)) {
          overlayCtx.fillStyle = color + '30'; // 반투명 배경
          overlayCtx.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        }
        
        overlayCtx.strokeStyle = color;
        overlayCtx.lineWidth = checkedBlocks.has(block.id) ? 3 : 2;
        overlayCtx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        
        // 블록 번호 표시
        overlayCtx.fillStyle = color;
        overlayCtx.fillRect(scaledX, scaledY - 25, 100, 25);
        overlayCtx.fillStyle = 'white';
        overlayCtx.font = 'bold 12px sans-serif';
        overlayCtx.fillText(block.title, scaledX + 5, scaledY - 8);
        
        // 호버 시 리사이즈 핸들 그리기
        if (hoveredBlockId === block.id || checkedBlocks.has(block.id)) {
          const handleSize = 8;
          const handles = [
            { x: scaledX, y: scaledY, type: 'nw' },
            { x: scaledX + scaledWidth - handleSize, y: scaledY, type: 'ne' },
            { x: scaledX, y: scaledY + scaledHeight - handleSize, type: 'sw' },
            { x: scaledX + scaledWidth - handleSize, y: scaledY + scaledHeight - handleSize, type: 'se' }
          ];
          
          overlayCtx.fillStyle = 'white';
          overlayCtx.strokeStyle = color;
          overlayCtx.lineWidth = 2;
          
          handles.forEach(handle => {
            overlayCtx.fillRect(handle.x, handle.y, handleSize, handleSize);
            overlayCtx.strokeRect(handle.x, handle.y, handleSize, handleSize);
          });
        }
        
        overlayCtx.restore();
      }
    });
  }
  
  function drawExistingBlocks() {
    if (!overlayCtx || !overlayCanvas) return;
    
    // 오버레이 캔버스 클리어
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // 블록들 그리기
    drawBlocks();
  }
  
  function removeBlock(blockId) {
    selectedBlocks = selectedBlocks.filter(block => block.id !== blockId);
    if (checkedBlocks.has(blockId)) {
      checkedBlocks.delete(blockId);
      checkedBlocks = new Set(checkedBlocks); // 반응성 트리거
    }
    
    // 블록 삭제 후 번호 재계산
    recalculateBlockNumbers();
    
    drawExistingBlocks();
  }
  
  // 체크박스 상태 변경
  function toggleBlockCheck(blockId) {
    if (checkedBlocks.has(blockId)) {
      checkedBlocks.delete(blockId);
    } else {
      checkedBlocks.add(blockId);
    }
    checkedBlocks = new Set(checkedBlocks); // 새로운 Set으로 할당하여 Svelte 반응성 트리거
    drawExistingBlocks();
  }
  
  // 전체 선택/해제
  function toggleAllBlocks() {
    if (checkedBlocks.size === selectedBlocks.length && selectedBlocks.length > 0) {
      checkedBlocks.clear();
    } else {
      checkedBlocks = new Set(selectedBlocks.map(b => b.id));
    }
    checkedBlocks = checkedBlocks; // Svelte 반응성 트리거
    drawExistingBlocks();
  }
  
  
  // 블록 연결 토글
  function toggleLinkBlock(block, questionId) {
    if (!block.linkedBlocks) {
      block.linkedBlocks = [];
    }
    
    const index = block.linkedBlocks.indexOf(questionId);
    if (index > -1) {
      block.linkedBlocks.splice(index, 1);
    } else {
      block.linkedBlocks.push(questionId);
    }
    
    // 반응성 트리거
    selectedBlocks = [...selectedBlocks];
  }

  // 드래그 상태
  let draggedBlock = null;
  let draggedIndex = null;
  let dropTargetIndex = null;

  function handleDragStart(event, block, index) {
    draggedBlock = block;
    draggedIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', block.id);
    event.currentTarget.classList.add('dragging');
  }

  function handleDragEnd(event) {
    draggedBlock = null;
    draggedIndex = null;
    dropTargetIndex = null;
    // 모든 드래그 관련 클래스 제거
    document.querySelectorAll('.drag-over, .drag-over-top, .drag-over-bottom, .dragging').forEach(el => {
      el.classList.remove('drag-over', 'drag-over-top', 'drag-over-bottom', 'dragging');
    });
  }

  function handleDragOver(event, targetIndex) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    if (draggedBlock && draggedIndex !== targetIndex) {
      dropTargetIndex = targetIndex;
      
      // 드롭 위치 표시를 위한 시각적 피드백
      const rect = event.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      
      // 마우스가 요소의 위쪽 절반에 있으면 위에 표시, 아래쪽 절반에 있으면 아래에 표시
      if (event.clientY < midpoint) {
        event.currentTarget.classList.remove('drag-over-bottom');
        event.currentTarget.classList.add('drag-over-top');
      } else {
        event.currentTarget.classList.remove('drag-over-top');
        event.currentTarget.classList.add('drag-over-bottom');
      }
    }
  }

  function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
  }

  function handleDrop(event, targetIndex) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    
    if (draggedBlock && draggedIndex !== null && targetIndex !== null && draggedIndex !== targetIndex) {
      // 배열에서 드래그된 블록 제거
      const newBlocks = [...selectedBlocks];
      const [movedBlock] = newBlocks.splice(draggedIndex, 1);
      
      // 드롭 위치 계산
      const rect = event.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      let insertIndex = targetIndex;
      
      // 마우스 위치에 따라 삽입 위치 결정
      if (event.clientY > midpoint && draggedIndex < targetIndex) {
        insertIndex = targetIndex;
      } else if (event.clientY > midpoint && draggedIndex > targetIndex) {
        insertIndex = targetIndex + 1;
      } else if (event.clientY <= midpoint && draggedIndex > targetIndex) {
        insertIndex = targetIndex;
      } else if (event.clientY <= midpoint && draggedIndex < targetIndex) {
        insertIndex = targetIndex - 1;
      }
      
      // 새 위치에 블록 삽입
      newBlocks.splice(insertIndex, 0, movedBlock);
      
      // 상태 업데이트
      selectedBlocks = newBlocks;
      
      // 블록 번호 재계산
      recalculateBlockNumbers();
      
      // 캔버스의 블록 영역 다시 그리기
      drawExistingBlocks();
    }
  }

  // 선택된 블록들 일괄 삭제
  function batchDeleteBlocks() {
    if (checkedBlocks.size === 0) return;
    
    if (confirm(`선택된 ${checkedBlocks.size}개의 블록을 삭제하시겠습니까?`)) {
      selectedBlocks = selectedBlocks.filter(block => !checkedBlocks.has(block.id));
      checkedBlocks.clear();
      
      // 블록 삭제 후 번호 재계산
      recalculateBlockNumbers();
      
      drawExistingBlocks();
    }
  }
  
  function proceedToConfiguration() {
    if (selectedBlocks.length === 0) {
      alert('추출할 블록을 선택해주세요.');
      return;
    }
    extractionStep = 'configure-blocks';
    updateHistory();
  }
  
  function goBack() {
    if (extractionStep === 'configure-blocks') {
      extractionStep = 'extract-blocks';
    } else {
      extractionStep = 'select-material';
    }
    updateHistory();
  }
  
  async function finalizeExtraction() {
    try {
      if (!supabase || localStorage.getItem('demo-mode') === 'true') {
        // 데모 모드 또는 개발 모드: localStorage에 저장
        const savedBlocks = localStorage.getItem('local-blocks') || '[]';
        const allBlocks = JSON.parse(savedBlocks);
        
        selectedBlocks.forEach(block => {
          allBlocks.push({
            ...block,
            material_id: selectedMaterial.id,
            material_title: selectedMaterial.title,
            created_at: new Date().toISOString(),
            // 필드 매핑
            subtype: block.format,
            correct_answer: block.answer,
            custom_tags: block.customTags || [],
            linked_blocks: block.linkedBlocks || [],
            image_data: block.imageData,
            page_number: block.page,
            chapter: block.chapter || ''
          });
        });
        
        localStorage.setItem('local-blocks', JSON.stringify(allBlocks));
      } else {
        // Supabase에 저장 - blocks 테이블 사용
        // 기존 블록은 업데이트, 새 블록은 삽입
        const existingBlocks = selectedBlocks.filter(block => block.isExisting);
        const newBlocks = selectedBlocks.filter(block => !block.isExisting);
        
        // 기존 블록 업데이트
        for (const block of existingBlocks) {
          const { error } = await supabase
            .from('blocks')
            .update({
              title: block.title,
              type: block.type,
              subtype: block.format || null,
              content: block.extractedText || block.content || '',
              correct_answer: block.answer || '',
              difficulty: block.difficulty || 'medium',
              tags: block.tags || [],
              custom_tags: block.customTags || [],
              score: block.score || 0,
              linked_blocks: block.linkedBlocks || []
            })
            .eq('id', block.id);
            
          if (error) {
            console.error('블록 업데이트 오류:', error);
          }
        }
        
        // 새 블록 삽입
        if (newBlocks.length > 0) {
          const blocksToInsert = newBlocks.map(block => ({
          user_id: $user.id,
          material_id: selectedMaterial.id,
          title: block.title, // 자료명 + 페이지 + 블록타입 + 번호
          type: block.type,
          subtype: block.format, // format → subtype
          content: block.extractedText || block.content || '',
          correct_answer: block.answer || '', // answer → correct_answer
          difficulty: block.difficulty || 'medium',
          tags: block.tags || [],
          custom_tags: block.customTags || [], // customTags → custom_tags
          page_number: block.page,
          score: block.score || 0,
          linked_blocks: block.linkedBlocks || [],
          image_data: block.imageData || null,
          chapter: block.chapter || '',
          options: block.options || null
        }));
        
        console.log('Inserting blocks:', blocksToInsert);
        
        const { data, error } = await supabase
          .from('blocks')
          .insert(blocksToInsert)
          .select();
        
        if (error) {
          console.error('Blocks insert error:', error);
          alert(`문항 저장 중 오류가 발생했습니다: ${error.message}`);
          return;
        }
        
          console.log('Blocks inserted successfully:', data);
        }
      }
      
      // materials store 업데이트
      const questionCount = selectedBlocks.filter(b => b.type === 'question').length;
      const updates = {
        is_extracted: true,
        extracted_count: questionCount,
        extraction_date: new Date().toISOString()
      };
      
      await updateMaterial(selectedMaterial.id, updates);
      
      // 임시 저장 데이터 삭제
      if (selectedMaterial) {
        localStorage.removeItem(`extract-temp-${selectedMaterial.id}`);
        // selection 정보도 저장 (다음에 다시 사용할 수 있도록)
        saveSelections();
      }
      
      alert(`${selectedBlocks.length}개의 블록이 추출되었습니다!`);
      
      if (confirm('문제 은행 페이지로 이동하시겠습니까?')) {
        goto('/question-bank');
      } else {
        goto('/my-materials');
      }
    } catch (error) {
      console.error('추출 완료 중 오류:', error);
      alert('추출 완료 중 오류가 발생했습니다.');
    }
  }
  
  function getBlockTypeInfo(type) {
    return blockTypes.find(t => t.value === type) || blockTypes[0];
  }
  
  // 일괄 작업 함수들
  function applyBulkType() {
    if (!bulkType || checkedBlocks.size === 0) return;
    
    selectedBlocks = selectedBlocks.map(block => {
      if (checkedBlocks.has(block.id)) {
        return { ...block, type: bulkType };
      }
      return block;
    });
    
    // Svelte 반응성 트리거를 위한 명시적 재할당
    selectedBlocks = [...selectedBlocks];
    
    bulkType = '';
    
    // 블록 타입 변경 후 번호 재계산
    recalculateBlockNumbers();
    
    drawExistingBlocks();
  }
  
  function applyBulkFormat() {
    if (!bulkFormat || checkedBlocks.size === 0) return;
    
    selectedBlocks = selectedBlocks.map(block => {
      if (checkedBlocks.has(block.id) && block.type === 'question') {
        return { ...block, format: bulkFormat };
      }
      return block;
    });
    bulkFormat = '';
  }
  
  function applyBulkScore() {
    if (!bulkScore || checkedBlocks.size === 0) return;
    
    selectedBlocks = selectedBlocks.map(block => {
      if (checkedBlocks.has(block.id) && block.type === 'question') {
        return { ...block, score: parseInt(bulkScore) };
      }
      return block;
    });
    bulkScore = '';
  }
  
  function applyBulkDifficulty() {
    if (!bulkDifficulty || checkedBlocks.size === 0) return;
    
    selectedBlocks = selectedBlocks.map(block => {
      if (checkedBlocks.has(block.id)) {
        return { ...block, difficulty: bulkDifficulty };
      }
      return block;
    });
    bulkDifficulty = '';
  }
  
  // 커스텀 태그 관련 함수
  function addCustomTag(block, tag) {
    if (!block.customTags) {
      block.customTags = [];
    }
    if (!block.customTags.includes(tag)) {
      block.customTags.push(tag);
      selectedBlocks = selectedBlocks;
    }
  }
  
  function removeCustomTag(block, tag) {
    if (block.customTags) {
      block.customTags = block.customTags.filter(t => t !== tag);
      selectedBlocks = selectedBlocks;
    }
  }
  
  // 완료된 항목 수 계산
  function getCompletedCount() {
    return selectedBlocks.filter(block => 
      block.type === 'question' && 
      block.format && 
      block.answer && 
      block.score
    ).length;
  }
  
  // 키보드 제어 함수들
  function handleKeyDown(event) {
    // 블록 영역 지정 단계에서 화살표 키로 페이지 이동
    if (extractionStep === 'extract-blocks' && !isSelecting) {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (currentPage > 1) {
            handlePageChange(currentPage - 1);
          }
          return;
          
        case 'ArrowRight':
          event.preventDefault();
          if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
          }
          return;
      }
    }
    
    if (extractionStep !== 'configure-blocks') return;
    
    // 편집 모드에서도 일부 키는 처리
    if (isEditingCell) {
      switch (event.key) {
        case 'Tab':
          if (!event.shiftKey) {
            event.preventDefault();
            moveToNextField();
          } else {
            event.preventDefault();
            moveToPrevField();
          }
          return;
          
        case 'Enter':
          event.preventDefault();
          moveToNextRow();
          return;
          
        case 'Escape':
          isEditingCell = false;
          currentFieldName = 'title';
          return;
      }
      return; // 편집 중일 때는 다른 키 처리 안함
    }
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (selectedRowIndex > 0) {
          selectedRowIndex--;
          scrollToRow(selectedRowIndex);
        }
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        if (selectedRowIndex < selectedBlocks.length - 1) {
          selectedRowIndex++;
          scrollToRow(selectedRowIndex);
        }
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        moveToPrevField();
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        moveToNextField();
        break;
        
      case 'Enter':
        event.preventDefault();
        if (!event.shiftKey) {
          // Enter: 현재 셀 편집
          isEditingCell = true;
          focusOnCell(currentFieldName, selectedRowIndex);
        } else {
          // Shift+Enter: 다음 필드로 이동
          moveToNextField();
        }
        break;
        
      case 'Delete':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // Ctrl/Cmd+Delete: 현재 행 삭제
          if (selectedBlocks[selectedRowIndex]) {
            removeBlock(selectedBlocks[selectedRowIndex].id);
            if (selectedRowIndex >= selectedBlocks.length) {
              selectedRowIndex = Math.max(0, selectedBlocks.length - 1);
            }
          }
        }
        break;
        
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          // Ctrl/Cmd+A: 모두 선택
          toggleAllBlocks();
        }
        break;
        
      case 'Space':
        event.preventDefault();
        // Space: 현재 행 체크박스 토글
        if (selectedBlocks[selectedRowIndex]) {
          toggleBlockCheck(selectedBlocks[selectedRowIndex].id);
        }
        break;
        
      case 'Tab':
        if (!event.shiftKey) {
          // Tab: 다음 필드로 이동
          event.preventDefault();
          moveToNextField();
        } else {
          // Shift+Tab: 이전 필드로 이동
          event.preventDefault();
          moveToPrevField();
        }
        break;
        
      case 'Escape':
        // Esc: 편집 모드 종료
        isEditingCell = false;
        currentFieldName = 'title';
        break;
        
      case 'F2':
        // F2: 현재 셀 편집
        event.preventDefault();
        isEditingCell = true;
        focusOnCell(currentFieldName, selectedRowIndex);
        break;
    }
  }
  
  function scrollToRow(index) {
    const table = document.querySelector('.overflow-x-auto');
    const rows = table?.querySelectorAll('tbody tr');
    if (rows && rows[index]) {
      rows[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  function focusOnCell(fieldName, rowIndex) {
    setTimeout(() => {
      const selector = `#${fieldName}-${rowIndex}`;
      const element = document.querySelector(selector);
      if (element) {
        element.focus();
        if (element.select) element.select();
      }
    }, 50);
  }
  
  // 현재 포커스된 필드 추적
  let currentFieldName = 'title';
  let currentFieldIndex = 0;
  
  function moveToNextRow() {
    if (selectedRowIndex < selectedBlocks.length - 1) {
      selectedRowIndex++;
      isEditingCell = true;
      scrollToRow(selectedRowIndex);
      focusOnCell(currentFieldName, selectedRowIndex);
    }
  }
  
  function moveToNextField() {
    const block = selectedBlocks[selectedRowIndex];
    if (!block) return;
    
    // 필드 순서 정의
    const fieldOrder = ['title', 'type'];
    if (block.type === 'question') {
      fieldOrder.push('format', 'answer', 'score');
    }
    fieldOrder.push('tags');
    
    // 현재 필드의 인덱스 찾기
    const currentIndex = fieldOrder.indexOf(currentFieldName);
    
    if (currentIndex < fieldOrder.length - 1) {
      // 같은 행의 다음 필드로 이동
      currentFieldName = fieldOrder[currentIndex + 1];
      isEditingCell = true;
      focusOnCell(currentFieldName, selectedRowIndex);
    } else if (selectedRowIndex < selectedBlocks.length - 1) {
      // 다음 행의 첫 번째 필드로 이동
      selectedRowIndex++;
      currentFieldName = 'title';
      isEditingCell = true;
      scrollToRow(selectedRowIndex);
      focusOnCell(currentFieldName, selectedRowIndex);
    }
  }
  
  function moveToPrevField() {
    const block = selectedBlocks[selectedRowIndex];
    if (!block) return;
    
    // 필드 순서 정의
    const fieldOrder = ['title', 'type'];
    if (block.type === 'question') {
      fieldOrder.push('format', 'answer', 'score');
    }
    fieldOrder.push('tags');
    
    // 현재 필드의 인덱스 찾기
    const currentIndex = fieldOrder.indexOf(currentFieldName);
    
    if (currentIndex > 0) {
      // 같은 행의 이전 필드로 이동
      currentFieldName = fieldOrder[currentIndex - 1];
      isEditingCell = true;
      focusOnCell(currentFieldName, selectedRowIndex);
    } else if (selectedRowIndex > 0) {
      // 이전 행의 마지막 필드로 이동
      selectedRowIndex--;
      const prevBlock = selectedBlocks[selectedRowIndex];
      const prevFieldOrder = ['title', 'type'];
      if (prevBlock.type === 'question') {
        prevFieldOrder.push('format', 'answer', 'score');
      }
      prevFieldOrder.push('tags');
      currentFieldName = prevFieldOrder[prevFieldOrder.length - 1];
      isEditingCell = true;
      scrollToRow(selectedRowIndex);
      focusOnCell(currentFieldName, selectedRowIndex);
    }
  }
  
  // Canvas 초기화 action
  function initCanvas(node) {
    ctx = node.getContext('2d');
    if (pdfDoc) {
      renderPage(currentPage);
    }
  }
  
  // 오버레이 Canvas 초기화 action
  function initOverlayCanvas(node) {
    overlayCtx = node.getContext('2d');
    // 초기화 후 블록 다시 그리기
    setTimeout(() => {
      drawExistingBlocks();
    }, 200);
  }
</script>

<svelte:head>
  <title>문항 추출 - Class Easy</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
  <!-- 상단 헤더 -->
  <div class="bg-base-100 shadow-sm">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">문항 추출</h1>
          {#if selectedMaterial}
            <div class="flex items-center gap-2 text-sm text-base-content/70">
              <span>{selectedMaterial.title}</span>
              <span class="text-primary">{currentPage}/{totalPages} 페이지</span>
              
              <!-- 자동 저장 상태 표시 -->
              {#if isSaving}
                <div class="flex items-center gap-1 text-warning">
                  <span class="loading loading-spinner loading-xs"></span>
                  <span>저장 중...</span>
                </div>
              {:else if lastSavedTime}
                <div class="flex items-center gap-1 text-success">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>자동 저장됨</span>
                </div>
              {/if}
            </div>
          {/if}
        </div>
        
        <div class="breadcrumbs text-sm">
          <ul>
            <li><a href="/">내 자료</a></li>
            <li>문항 추출</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="container mx-auto px-4 py-6">
    {#if extractionStep === 'select-material'}
      <!-- 1단계: 자료 선택 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title mb-4">문항을 추출할 자료를 선택하세요</h2>
          
          {#if $materials.filter(m => m.type === 'original').length === 0}
            <div class="text-center py-12">
              <div class="text-4xl mb-4">📁</div>
              <h3 class="text-lg font-medium mb-2">원본 자료가 없습니다</h3>
              <p class="text-base-content/70 mb-4">
                먼저 자료를 업로드해주세요
              </p>
              <a href="/my-materials" class="btn btn-primary">자료 업로드하기</a>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each $materials.filter(m => m.type === 'original') as material}
                <div 
                  class="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-primary"
                  on:click={() => selectMaterial(material)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && selectMaterial(material)}
                >
                  <div class="card-body">
                    <div class="flex items-start justify-between mb-2">
                      <div class="text-2xl">{getFileTypeIcon(material.file_type)}</div>
                      {#if material.is_extracted}
                        <div class="badge badge-success badge-sm">추출됨</div>
                      {:else}
                        <div class="badge badge-primary badge-sm">원본</div>
                      {/if}
                    </div>
                    
                    <h3 class="card-title text-sm mb-2">{material.title}</h3>
                    
                    <div class="text-xs text-base-content/70 space-y-1">
                      {#if material.file_size}
                        <p>{formatFileSize(material.file_size)}</p>
                      {/if}
                      {#if material.pages}
                        <p>{material.pages}페이지</p>
                      {/if}
                      {#if material.is_extracted}
                        <p class="text-success">{material.extracted_count}개 추출됨</p>
                      {/if}
                    </div>
                    
                    <div class="card-actions justify-end mt-2">
                      <button class="btn btn-primary btn-sm">선택</button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
    {:else if extractionStep === 'extract-blocks'}
      <!-- 2단계: 블록 영역 지정 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- 좌측: 페이지 미리보기 -->
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <!-- 툴바 -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                  <div class="tabs tabs-boxed">
                    <button 
                      class="tab tab-sm {extractionMode === 'manual' ? 'tab-active' : ''}"
                      on:click={() => setExtractionMode('manual')}
                    >
                      수동 선택
                    </button>
                    <button 
                      class="tab tab-sm {extractionMode === 'auto' ? 'tab-active' : ''}"
                      on:click={() => setExtractionMode('auto')}
                    >
                      자동 추출
                    </button>
                  </div>
                  
                  {#if extractionMode === 'auto'}
                    <button 
                      class="btn btn-primary btn-sm" 
                      on:click={autoExtractBlocks}
                      disabled={isExtracting}
                    >
                      {#if isExtracting}
                        <span class="loading loading-spinner loading-xs"></span>
                        추출 중...
                      {:else}
                        자동 문항 추출
                      {/if}
                    </button>
                  {/if}
                </div>
                
                <!-- 줌 컨트롤 -->
                <div class="flex items-center gap-2">
                  <button 
                    class="btn btn-ghost btn-sm"
                    on:click={handleZoomOut}
                    disabled={zoomLevel <= minZoom}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </button>
                  <span class="text-sm font-medium">{Math.round(zoomLevel * 100)}%</span>
                  <button 
                    class="btn btn-ghost btn-sm"
                    on:click={handleZoomIn}
                    disabled={zoomLevel >= maxZoom}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button 
                    class="btn btn-ghost btn-sm"
                    on:click={handleZoomReset}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                  <button 
                    class="btn btn-ghost btn-sm"
                    on:click={() => renderPage(currentPage)}
                    title="캔버스 새로고침"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                
                <!-- 페이지 네비게이션 -->
                <div class="flex items-center gap-2">
                  <button 
                    class="btn btn-ghost btn-sm"
                    disabled={currentPage <= 1}
                    on:click={() => handlePageChange(currentPage - 1)}
                  >
                    ←
                  </button>
                  <span class="text-sm">{currentPage} / {totalPages}</span>
                  <button 
                    class="btn btn-ghost btn-sm"
                    disabled={currentPage >= totalPages}
                    on:click={() => handlePageChange(currentPage + 1)}
                  >
                    →
                  </button>
                </div>
              </div>
              
              <!-- 페이지 미리보기 -->
              <div class="bg-gray-50 p-4 rounded-lg overflow-auto" style="max-height: 840px;">
                {#if fileDataUrl}
                  {#if selectedMaterial.file_type === 'application/pdf'}
                    <!-- PDF 캔버스 -->
                    <div class="flex justify-center relative" bind:this={canvasContainer}>
                      <div class="relative">
                        <canvas
                          bind:this={canvas}
                          class="shadow-lg"
                          use:initCanvas
                        ></canvas>
                        <canvas
                          bind:this={overlayCanvas}
                          class="absolute top-0 left-0 {extractionMode === 'manual' ? 'cursor-crosshair' : ''} pointer-events-auto"
                          style="position: absolute; top: 0; left: 0;"
                          use:initOverlayCanvas
                          on:mousedown={handleMouseDown}
                          on:mousemove={handleMouseMove}
                          on:mouseup={handleMouseUp}
                          on:mouseleave={handleMouseUp}
                        ></canvas>
                      </div>
                      {#if extractionMode === 'manual' && selectedBlocks.length === 0}
                        <div class="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm">
                          영역을 드래그하여 선택하세요
                        </div>
                      {/if}
                    </div>
                  {:else if selectedMaterial.file_type.startsWith('image/')}
                    <!-- 이미지 표시 -->
                    <div class="flex justify-center">
                      <img 
                        src={fileDataUrl} 
                        alt={selectedMaterial.title}
                        style="max-width: 100%;"
                        class="shadow-lg"
                      />
                    </div>
                  {/if}
                {:else if isLoading}
                  <div class="flex items-center justify-center h-96">
                    <div class="text-center">
                      <span class="loading loading-spinner loading-lg"></span>
                      <p class="mt-4">파일을 불러오는 중...</p>
                    </div>
                  </div>
                {:else}
                  <!-- 더미 페이지 콘텐츠 -->
                  <div class="bg-white shadow-lg mx-auto relative" style="width: 100%; max-width: 595px; min-height: 400px;">
                    <div class="p-6">
                      <h2 class="text-lg font-bold mb-4">수학 문제 - 페이지 {currentPage}</h2>
                      
                      <div class="space-y-4">
                        <div class="p-3 border border-gray-200 rounded">
                          <p class="font-medium mb-2">1. 다음 중 이차함수의 그래프가 아래로 볼록한 조건은?</p>
                          <div class="ml-4 space-y-1 text-sm">
                            <p>① a &gt; 0</p>
                            <p>② a &lt; 0</p>
                            <p>③ a = 0</p>
                            <p>④ 상관없음</p>
                          </div>
                        </div>
                        
                        <div class="p-3 border border-gray-200 rounded">
                          <p class="font-medium">2. f(x) = x² - 4x + 3의 최솟값을 구하시오.</p>
                        </div>
                        
                        <div class="p-3 bg-blue-50 border border-blue-200 rounded">
                          <h4 class="font-medium text-blue-800 mb-2">해설</h4>
                          <p class="text-sm text-blue-700">이차함수 f(x) = ax² + bx + c에서 a > 0이면 그래프가 아래로 볼록하다.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
              
              <div class="mt-4 text-center">
                <p class="text-sm text-base-content/70">
                  {#if extractionMode === 'manual'}
                    수동 선택 모드: 블록 추가 버튼을 클릭하여 문제를 추가하세요
                  {:else}
                    자동 추출 모드: 자동 문항 추출 버튼을 클릭하세요
                  {/if}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 우측: 선택된 블록 관리 -->
        <div class="lg:col-span-1">
          <div class="card bg-base-100 shadow">
            <div class="card-body p-4">
              <!-- 헤더 -->
              <div class="flex items-center justify-between mb-4 border-b pb-2">
                <div class="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={allChecked}
                    indeterminate={someChecked}
                    on:change={toggleAllBlocks}
                  />
                  <h3 class="font-bold text-lg">추출된 블록</h3>
                </div>
                <div class="flex items-center gap-2">
                  <button class="btn btn-ghost btn-xs">병합</button>
                  <div class="divider divider-horizontal mx-0"></div>
                  <button class="btn btn-ghost btn-xs" disabled>분리</button>
                  <div class="divider divider-horizontal mx-0"></div>
                  <button 
                    class="btn btn-ghost btn-xs text-error"
                    on:click={batchDeleteBlocks}
                    disabled={checkedBlocks.size === 0}
                  >
                    삭제
                  </button>
                </div>
              </div>
              
              <!-- 블록 리스트 -->
              <div class="space-y-2 overflow-y-auto" style="max-height: 840px;">
                {#each selectedBlocks as block, index}
                  <div 
                    class="rect-block-item" 
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, block, index)}
                    on:dragend={handleDragEnd}
                    on:dragover={(e) => handleDragOver(e, index)}
                    on:dragleave={handleDragLeave}
                    on:drop={(e) => handleDrop(e, index)}
                  >
                    <div class="space-y-2">
                      <!-- 블록 헤더 -->
                      <div class="flex items-center gap-2">
                        <input 
                          type="checkbox"
                          class="checkbox checkbox-sm checkbox-primary"
                          checked={checkedBlocks.has(block.id)}
                          on:change={() => toggleBlockCheck(block.id)}
                        />
                        {#if (block.type === 'passage' || block.type === 'explanation') && block.linkedBlocks && block.linkedBlocks.length > 0}
                          <div class="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" class="text-primary">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
                            </svg>
                          </div>
                        {/if}
                        {#if block.type === 'question'}
                          {@const linkedPassages = selectedBlocks.filter(b => 
                            (b.type === 'passage' || b.type === 'explanation') && 
                            b.linkedBlocks && b.linkedBlocks.includes(block.id)
                          )}
                          {#if linkedPassages.length > 0}
                            <div class="flex items-center gap-1">
                              {#each linkedPassages as linked}
                                <div class="tooltip" data-tip={linked.title}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" 
                                    class="text-{linked.type === 'passage' ? 'warning' : linked.type === 'concept' ? 'secondary' : linked.type === 'explanation' ? 'success' : 'primary'}">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                                  </svg>
                                </div>
                              {/each}
                            </div>
                          {/if}
                        {/if}
                        <span class="font-medium text-sm min-w-[80px]">{block.title} ({block.page}p)</span>
                        <div class="flex gap-1">
                          {#each blockTypes as type}
                            <button
                              class="btn btn-xs {block.type === type.value ? type.color : 'btn-ghost'}"
                              on:click={() => updateBlockType(block.id, type.value)}
                            >
                              {type.label}
                            </button>
                          {/each}
                        </div>
                        <div class="flex-1"></div>
                        <button 
                          class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error hover:text-white"
                          title="블록 삭제"
                          on:click={() => removeBlock(block.id)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
                          </svg>
                        </button>
                      </div>
                      
                      <!-- 블록 옵션 -->
                      {#if block.type === 'question'}
                        <div class="flex items-center gap-2 pl-6">
                          <select class="select select-xs select-bordered" bind:value={block.format}>
                            <option value="">문항 유형 선택</option>
                            <option value="multiple_choice">객관식</option>
                            <option value="short_answer">단답형</option>
                            <option value="essay">서술형</option>
                            <option value="true_false">O/X</option>
                          </select>
                          <div class="flex-1"></div>
                          <div class="rect-drag-icon cursor-move text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 15a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2zm0-4a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2z"></path>
                            </svg>
                          </div>
                        </div>
                      {:else if block.type === 'passage' || block.type === 'explanation'}
                        <div class="flex items-center gap-2 pl-6">
                          <div class="dropdown dropdown-top">
                            <label tabindex="0" class="btn btn-xs btn-outline">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
                              </svg>
                              문제 연결
                              {#if block.linkedBlocks && block.linkedBlocks.length > 0}
                                <span class="badge badge-xs badge-primary">{block.linkedBlocks.length}</span>
                              {/if}
                            </label>
                            <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto z-50">
                              {#each selectedBlocks.filter(b => b.type === 'question') as question, qIndex}
                                <li>
                                  <label class="cursor-pointer label">
                                    <input 
                                      type="checkbox" 
                                      class="checkbox checkbox-xs"
                                      checked={block.linkedBlocks && block.linkedBlocks.includes(question.id)}
                                      on:change={() => toggleLinkBlock(block, question.id)}
                                    />
                                    <span class="label-text text-xs">{question.title}</span>
                                  </label>
                                </li>
                              {/each}
                              {#if selectedBlocks.filter(b => b.type === 'question').length === 0}
                                <li class="text-xs text-base-content/50 p-2">문제 블록이 없습니다</li>
                              {/if}
                            </ul>
                          </div>
                          <div class="flex-1"></div>
                          <div class="rect-drag-icon cursor-move text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 15a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2zm0-4a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2z"></path>
                            </svg>
                          </div>
                        </div>
                      {:else}
                        <div class="flex items-center gap-2 pl-6">
                          <div class="flex-1"></div>
                          <div class="rect-drag-icon cursor-move text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5 15a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2zm0-4a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2z"></path>
                            </svg>
                          </div>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
                
                {#if selectedBlocks.length === 0}
                  <div class="text-center py-8">
                    <div class="text-4xl mb-2">📝</div>
                    <p class="text-sm text-base-content/70">
                      {#if extractionMode === 'manual'}
                        PDF에서 마우스로<br/>
                        영역을 드래그하세요
                      {:else}
                        자동 문항 추출 버튼을 눌러주세요
                      {/if}
                    </p>
                  </div>
                {/if}
              </div>
              
              <!-- 하단 일괄 작업 및 버튼 -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                {#if checkedBlocks.size > 0}
                  <div class="space-y-3 mb-3 bg-base-200 rounded-lg p-3">
                    <div class="text-sm font-bold text-primary">{checkedBlocks.size}개 선택됨</div>
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">블록 타입 :</span>
                      <div class="flex gap-1">
                        {#each blockTypes as type}
                          <button
                            class="btn btn-xs {bulkType === type.value ? type.color : 'btn-ghost'}"
                            on:click={() => {
                              bulkType = type.value;
                              applyBulkType();
                            }}
                          >
                            {type.label}
                          </button>
                        {/each}
                      </div>
                    </div>
                    <button class="btn btn-error btn-sm btn-block" on:click={batchDeleteBlocks}>
                      선택한 {checkedBlocks.size}개 블록 삭제
                    </button>
                  </div>
                {/if}
                
                <div class="flex justify-end gap-2">
                  <button class="btn btn-outline btn-sm" on:click={goBack}>
                    뒤로
                  </button>
                  <button 
                    class="btn btn-primary btn-sm" 
                    disabled={selectedBlocks.length === 0}
                    on:click={proceedToConfiguration}
                  >
                    추출하기 ({selectedBlocks.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    {:else if extractionStep === 'configure-blocks'}
      <!-- 3단계: 블록 정보 입력 -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">블록 정보 입력</h2>
            <p class="text-base-content/70">추출된 블록들의 세부 정보를 표에서 일괄 편집하세요</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline" on:click={goBack}>뒤로</button>
            <button class="btn btn-primary" on:click={finalizeExtraction}>추출 완료</button>
          </div>
        </div>
        
        <!-- 일괄 작업 도구 -->
        {#if checkedBlocks.size > 0}
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="space-y-3">
                <!-- 체크된 항목 상태 표시 -->
                <div class="text-sm text-info">
                  {checkedBlocks.size}개 항목이 선택되었습니다.
                </div>
                
                <div class="flex flex-wrap gap-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">블록타입 :</span>
                  <select 
                    class="select select-bordered select-sm w-24"
                    bind:value={bulkType}
                  >
                    <option value="">선택</option>
                    {#each blockTypes as type}
                      <option value={type.value}>{type.label}</option>
                    {/each}
                  </select>
                  <button 
                    class="btn btn-primary btn-sm" 
                    disabled={!bulkType || checkedBlocks.size === 0}
                    on:click={applyBulkType}
                  >
                    변경
                  </button>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">문항유형 :</span>
                  <select 
                    class="select select-bordered select-sm w-24"
                    bind:value={bulkFormat}
                  >
                    <option value="">선택</option>
                    <option value="multiple_choice">객관식</option>
                    <option value="short_answer">단답형</option>
                    <option value="essay">서술형</option>
                    <option value="true_false">O/X</option>
                  </select>
                  <button 
                    class="btn btn-primary btn-sm" 
                    disabled={!bulkFormat || checkedBlocks.size === 0}
                    on:click={applyBulkFormat}
                  >
                    변경
                  </button>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">배점 :</span>
                  <input 
                    type="number" 
                    class="input input-bordered input-sm w-20" 
                    placeholder="3" 
                    min="1"
                    bind:value={bulkScore}
                  >
                  <button 
                    class="btn btn-primary btn-sm" 
                    disabled={!bulkScore || checkedBlocks.size === 0}
                    on:click={applyBulkScore}
                  >
                    변경
                  </button>
                </div>
                
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">난이도 :</span>
                  <select 
                    class="select select-bordered select-sm w-32"
                    bind:value={bulkDifficulty}
                  >
                    <option value="">선택</option>
                    <option value="very_easy">매우 쉬움</option>
                    <option value="easy">쉬움</option>
                    <option value="medium">보통</option>
                    <option value="hard">어려움</option>
                    <option value="very_hard">매우 어려움</option>
                  </select>
                  <button 
                    class="btn btn-primary btn-sm" 
                    disabled={!bulkDifficulty || checkedBlocks.size === 0}
                    on:click={applyBulkDifficulty}
                  >
                    변경
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/if}
        
        <!-- 표 형식 편집기 -->
        <div class="card bg-base-100 shadow">
          <div class="card-body p-0">
            <div class="editable-table-container" tabindex="-1">
              <div class="overflow-x-auto" style="max-height: 840px;">
                <table class="editable-table w-full">
                  <thead class="sticky top-0 bg-base-200">
                    <tr>
                      <th class="p-3 text-left border-b" style="width: 50px;">
                        <input 
                          type="checkbox" 
                          class="checkbox checkbox-sm"
                          checked={allChecked}
                          indeterminate={someChecked}
                          on:change={toggleAllBlocks}
                        >
                      </th>
                      <th class="p-3 text-left border-b" style="width: 100px;">타입</th>
                      <th class="p-3 text-left border-b" style="width: 120px;">문항 유형</th>
                      <th class="p-3 text-left border-b" style="width: 150px;">
                        <div class="flex items-center gap-2">
                          <span>정답</span>
                          <div class="tooltip tooltip-bottom" data-tip="버티컬 바 | 로 복수 정답 입력 (ex. 3|4)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2M0 12C0 5.373 5.373 0 12 0s12 5.373 12 12-5.373 12-12 12S0 18.627 0 12" clip-rule="evenodd"></path>
                              <path d="M13.082 9.701h-2V18.2h2zm-1.041-4.412c-.888 0-1.459.545-1.459 1.38 0 .844.571 1.388 1.459 1.388S13.5 7.513 13.5 6.669c0-.835-.571-1.38-1.459-1.38"></path>
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th class="p-3 text-left border-b" style="width: 80px;">배점</th>
                      <th class="p-3 text-left border-b" style="width: 100px;">난이도</th>
                      <th class="p-3 text-left border-b" style="width: 150px;">연결</th>
                      <th class="p-3 text-left border-b" style="width: 200px;">커스텀 태그</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each selectedBlocks as block, index}
                      <tr class="hover:bg-base-100 {index === selectedRowIndex ? 'bg-primary/10' : ''}">
                        <td class="p-3 border-b bg-base-100">
                          <div class="flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              class="checkbox checkbox-sm"
                              checked={checkedBlocks.has(block.id)}
                              on:change={() => toggleBlockCheck(block.id)}
                            >
                            <span class="font-medium text-center text-sm">{index + 1}</span>
                          </div>
                        </td>
                        <td class="p-3 border-b">
                          <select 
                            id="type-{index}"
                            class="select select-bordered select-sm w-full bg-transparent"
                            value={block.type}
                            on:change={(e) => updateBlockType(block.id, e.target.value)}
                            on:focus={() => { selectedRowIndex = index; currentFieldName = 'type'; }}
                          >
                            {#each blockTypes as type}
                              <option value={type.value}>{type.label}</option>
                            {/each}
                          </select>
                        </td>
                        <td class="p-3 border-b">
                          {#if block.type === 'question'}
                            <select 
                              id="format-{index}"
                              class="select select-bordered select-sm w-full bg-transparent"
                              bind:value={block.format}
                              on:focus={() => { selectedRowIndex = index; currentFieldName = 'format'; }}
                            >
                              <option value="">선택</option>
                              <option value="multiple_choice">객관식</option>
                              <option value="short_answer">단답형</option>
                              <option value="essay">서술형</option>
                              <option value="true_false">O/X</option>
                            </select>
                          {:else}
                            <span class="text-xs text-base-content/50">-</span>
                          {/if}
                        </td>
                        <td class="p-3 border-b">
                          {#if block.type === 'question'}
                            <input 
                              id="answer-{index}"
                              type="text" 
                              class="input input-bordered input-sm w-full bg-transparent"
                              placeholder="정답 입력"
                              bind:value={block.answer}
                              on:focus={() => { selectedRowIndex = index; currentFieldName = 'answer'; isEditingCell = true; }}
                              on:blur={() => { isEditingCell = false; }}
                            >
                          {:else}
                            <span class="text-xs text-base-content/50">-</span>
                          {/if}
                        </td>
                        <td class="p-3 border-b">
                          {#if block.type === 'question'}
                            <input 
                              id="score-{index}"
                              type="number" 
                              class="input input-bordered input-sm w-full bg-transparent"
                              placeholder="3"
                              min="1"
                              bind:value={block.score}
                              on:focus={() => { selectedRowIndex = index; currentFieldName = 'score'; isEditingCell = true; }}
                              on:blur={() => { isEditingCell = false; }}
                            >
                          {:else}
                            <span class="text-xs text-base-content/50">-</span>
                          {/if}
                        </td>
                        <td class="p-3 border-b">
                          <select 
                            id="difficulty-{index}"
                            class="select select-bordered select-sm w-full bg-transparent"
                            bind:value={block.difficulty}
                            on:focus={() => { selectedRowIndex = index; currentFieldName = 'difficulty'; }}
                          >
                            <option value="">선택</option>
                            <option value="very_easy">매우 쉬움</option>
                            <option value="easy">쉬움</option>
                            <option value="medium">보통</option>
                            <option value="hard">어려움</option>
                            <option value="very_hard">매우 어려움</option>
                          </select>
                        </td>
                        <td class="p-3 border-b">
                          {#if block.type === 'passage' || block.type === 'explanation'}
                            <div class="dropdown">
                              <label tabindex="0" class="btn btn-xs btn-ghost flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path>
                                </svg>
                                {#if block.linkedBlocks && block.linkedBlocks.length > 0}
                                  <span class="text-xs">
                                    {block.linkedBlocks.map(id => selectedBlocks.findIndex(b => b.id === id) + 1).join(', ')}
                                  </span>
                                {:else}
                                  <span class="text-xs">연결</span>
                                {/if}
                              </label>
                              <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 max-h-60 overflow-y-auto z-50">
                                {#each selectedBlocks.filter(b => b.type === 'question') as question, qIndex}
                                  <li>
                                    <label class="cursor-pointer label p-2">
                                      <input 
                                        type="checkbox" 
                                        class="checkbox checkbox-xs"
                                        checked={block.linkedBlocks && block.linkedBlocks.includes(question.id)}
                                        on:change={() => toggleLinkBlock(block, question.id)}
                                      />
                                      <span class="label-text text-xs flex-1">{question.title}</span>
                                    </label>
                                  </li>
                                {/each}
                                {#if selectedBlocks.filter(b => b.type === 'question').length === 0}
                                  <li class="text-xs text-base-content/50 p-2">문제 블록이 없습니다</li>
                                {/if}
                              </ul>
                            </div>
                          {:else if block.type === 'question' && block.linkedBlocks && block.linkedBlocks.length > 0}
                            <div class="flex flex-wrap gap-1">
                              {#each block.linkedBlocks as linkedId}
                                {@const linkedBlock = selectedBlocks.find(b => b.id === linkedId)}
                                {#if linkedBlock}
                                  <span class="badge badge-sm badge-{linkedBlock.type === 'question' ? 'primary' : linkedBlock.type === 'passage' ? 'warning' : linkedBlock.type === 'concept' ? 'secondary' : 'success'}">
                                    {linkedBlock.title}
                                  </span>
                                {/if}
                              {/each}
                            </div>
                          {:else}
                            <span class="text-xs text-base-content/50">-</span>
                          {/if}
                        </td>
                        <td class="p-3 border-b">
                          <div class="flex flex-wrap gap-1">
                            {#if block.customTags && block.customTags.length > 0}
                              {#each block.customTags as tag}
                                <span class="badge badge-sm badge-ghost">
                                  {tag}
                                  <button 
                                    class="ml-1 text-xs"
                                    on:click={() => removeCustomTag(block, tag)}
                                  >
                                    ×
                                  </button>
                                </span>
                              {/each}
                            {/if}
                            <input 
                              id="tags-{index}"
                              type="text" 
                              class="input input-xs input-ghost w-20"
                              placeholder="+태그"
                              on:focus={() => { selectedRowIndex = index; currentFieldName = 'tags'; isEditingCell = true; }}
                              on:blur={() => { isEditingCell = false; }}
                              on:keypress={(e) => {
                                if (e.key === 'Enter' && e.target.value) {
                                  addCustomTag(block, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            >
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="p-4 border-t bg-base-200">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-4">
                  <span>총 {selectedBlocks.length}개 블록</span>
                  <span>문항: {selectedBlocks.filter(b => b.type === 'question').length}개</span>
                  <span>필수 입력 완료: {getCompletedCount()}/{selectedBlocks.filter(b => b.type === 'question').length}</span>
                </div>
                <div class="text-base-content/70">
                  * 표시는 필수 입력 항목 | 화살표/Tab/Enter로 이동 | Shift/Ctrl로 다중선택
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* 블록 아이템 스타일 */
  .rect-block-item {
    @apply bg-base-100 border border-base-300 rounded-lg p-3 transition-all;
  }
  
  .rect-block-item:hover {
    @apply shadow-md;
    border-color: rgba(87, 13, 248, 0.5);
  }
  
  .rect-drag-icon {
    @apply transition-opacity opacity-50;
  }
  
  .rect-drag-icon:hover {
    @apply opacity-100;
  }

  /* 드래그 앤 드롭 스타일 */
  .rect-block-item.drag-over {
    @apply border-primary border-2;
    background-color: rgba(87, 13, 248, 0.05);
  }

  .rect-block-item.dragging {
    @apply opacity-50;
  }

  /* 드래그 위치 표시 */
  .rect-block-item.drag-over-top {
    position: relative;
  }
  
  .rect-block-item.drag-over-top::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #3B82F6;
    border-radius: 2px;
  }
  
  .rect-block-item.drag-over-bottom {
    position: relative;
  }
  
  .rect-block-item.drag-over-bottom::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 4px;
    background-color: #3B82F6;
    border-radius: 2px;
  }

  /* 추가 스타일 */
  .card {
    transition: all 0.3s ease;
  }
  
  .card:hover {
    transform: translateY(-2px);
  }
  
  .cursor-crosshair {
    cursor: crosshair !important;
  }
  
  .pointer-events-auto {
    pointer-events: auto;
  }
  
  /* 편집 가능한 테이블 스타일 */
  .editable-table-container {
    position: relative;
  }
  
  .editable-table {
    border-collapse: collapse;
  }
  
  .editable-table th,
  .editable-table td {
    position: relative;
  }
  
  .editable-table tbody td {
    transition: background-color 0.1s ease;
  }
  
  .editable-table tbody td.focus-cell {
    background-color: var(--primary) !important;
    opacity: 0.1;
  }
  
  .editable-table tbody td.selected-cell {
    outline: 2px solid var(--primary);
    outline-offset: -2px;
  }
</style>