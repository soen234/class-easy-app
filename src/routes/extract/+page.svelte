<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials, updateMaterial, formatFileSize, getFileTypeIcon } from '$lib/stores/materials.js';
  import { addBlock } from '$lib/stores/blocks.js';
  import { goto } from '$app/navigation';
  import { getFile, migrateFromLocalStorage } from '$lib/utils/fileStorage.js';
  import { supabase } from '$lib/supabase.js';
  
  let selectedMaterial = null;
  let currentPage = 1;
  let totalPages = 10;
  let extractionMode = 'manual';
  let selectedBlocks = [];
  let nextBlockId = 1;
  let extractionStep = 'select-material';
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
  
  // 블록 타입
  const blockTypes = [
    { value: 'question', label: '문제', icon: '❓', color: 'btn-primary' },
    { value: 'passage', label: '지문', icon: '📜', color: 'btn-secondary' },
    { value: 'concept', label: '개념', icon: '💡', color: 'btn-accent' },
    { value: 'explanation', label: '해설', icon: '📝', color: 'btn-info' }
  ];
  
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
      
      // URL 파라미터에서 materialId 확인
      const materialId = $page.url.searchParams.get('materialId');
      if (materialId) {
        const material = $materials.find(m => m.id === materialId);
        if (material) {
          selectMaterial(material);
        }
      }
    }
    
    // 키보드 이벤트 리스너 추가
    if (browser) {
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  });
  
  async function selectMaterial(material) {
    selectedMaterial = material;
    extractionStep = 'extract-blocks';
    totalPages = material.pages || 10;
    
    // 파일 로드
    await loadFile();
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
    isExtracting = true;
    
    // 시뮬레이션을 위한 가짜 지연
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const autoBlocks = [
      {
        id: `block-auto-1`,
        type: 'question',
        title: `문제 1`,
        page: currentPage,
        selection: { x: 50, y: 100, width: 400, height: 80 },
        content: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?',
        format: 'multiple_choice',
        answer: '',
        tags: [],
        linkedBlocks: [],
        extractedText: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?',
        imageData: null
      },
      {
        id: `block-auto-2`,
        type: 'question',
        title: `문제 2`,
        page: currentPage,
        selection: { x: 50, y: 200, width: 350, height: 60 },
        content: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.',
        format: 'short_answer',
        answer: '',
        tags: [],
        linkedBlocks: [],
        extractedText: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.',
        imageData: null
      }
    ];
    
    selectedBlocks = [...selectedBlocks, ...autoBlocks];
    nextBlockId += autoBlocks.length;
    isExtracting = false;
    
    // 자동 추출 후 블록 그리기
    setTimeout(() => {
      drawExistingBlocks();
    }, 100);
  }
  
  // 영역 선택 모드 토글
  function toggleSelection() {
    isSelecting = !isSelecting;
  }
  
  // 마우스 이벤트 핸들러
  function handleMouseDown(e) {
    if (extractionMode !== 'manual' || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    selectionStart = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
    
    selectionRect = {
      x: selectionStart.x,
      y: selectionStart.y,
      width: 0,
      height: 0
    };
  }
  
  function handleMouseMove(e) {
    if (extractionMode !== 'manual' || !selectionStart || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    selectionRect = {
      x: Math.min(selectionStart.x, currentX),
      y: Math.min(selectionStart.y, currentY),
      width: Math.abs(currentX - selectionStart.x),
      height: Math.abs(currentY - selectionStart.y)
    };
    
    // 오버레이 캔버스에만 선택 영역 그리기
    drawSelectionOverlay();
  }
  
  function handleMouseUp(e) {
    if (extractionMode !== 'manual' || !selectionStart || !selectionRect) return;
    
    if (selectionRect.width > 10 && selectionRect.height > 10) {
      // 영역이 충분히 큰 경우에만 블록 생성
      createBlockFromSelection();
    }
    
    // 선택 모드 종료
    isSelecting = false;
    selectionStart = null;
    selectionRect = null;
    clearSelectionOverlay();
  }
  
  function createBlockFromSelection() {
    if (!selectionRect || !canvas) return;
    
    // 선택된 영역의 이미지 캡처
    const imageData = captureCanvasArea(selectionRect);
    
    // 기본 타입은 문제
    const defaultType = 'question';
    blockCounters[defaultType]++;
    
    const typeInfo = blockTypes.find(t => t.value === defaultType);
    const title = `${typeInfo.label} ${blockCounters[defaultType]}`;
    
    // 현재 스케일 비율을 반영하여 블록 좌표를 베이스 스케일로 정규화
    const scaleRatio = currentScale / baseScale;
    const normalizedSelection = {
      x: selectionRect.x / scaleRatio,
      y: selectionRect.y / scaleRatio,
      width: selectionRect.width / scaleRatio,
      height: selectionRect.height / scaleRatio
    };
    
    const newBlock = {
      id: `block-${nextBlockId}`,
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
  }
  
  // 블록 타입 변경 시 제목 업데이트
  function updateBlockType(blockId, newType) {
    selectedBlocks = selectedBlocks.map(block => {
      if (block.id === blockId) {
        return { ...block, type: newType };
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
    
    // 임시 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 선택 영역 복사
    tempCtx.drawImage(
      canvas,
      rect.x, rect.y, rect.width, rect.height,
      0, 0, rect.width, rect.height
    );
    
    // base64로 변환
    return tempCanvas.toDataURL('image/png');
  }
  
  function drawSelectionOverlay() {
    if (!overlayCtx || !overlayCanvas) return;
    
    // 오버레이 캔버스 클리어
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
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
  }
  
  function drawSelectionRect() {
    if (!ctx || !selectionRect) return;
    
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );
    ctx.restore();
  }
  
  function drawExistingBlocks() {
    if (!overlayCtx || !overlayCanvas) return;
    
    // 오버레이 캔버스 클리어
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    // 스케일 비율 계산 (현재 스케일 / 블록 생성 시 스케일)
    const scaleRatio = currentScale / baseScale;
    
    // 선택된 블록들 그리기
    selectedBlocks.forEach(block => {
      if (block.page === currentPage && block.selection) {
        overlayCtx.save();
        
        // 블록 타입에 따른 색상 설정
        const colors = {
          question: '#3B82F6',    // 파란색
          passage: '#8B5CF6',     // 보라색
          concept: '#F59E0B',     // 주황색
          explanation: '#10B981'  // 초록색
        };
        
        const color = colors[block.type] || '#3B82F6';
        
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
        overlayCtx.restore();
      }
    });
    
    // 현재 선택 중인 영역도 표시
    if (selectionRect && selectionStart) {
      drawSelectionRect();
    }
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
  let dropTargetBlock = null;

  function handleDragStart(event, block) {
    draggedBlock = block;
    event.dataTransfer.effectAllowed = 'link';
    event.dataTransfer.setData('text/plain', block.id);
  }

  function handleDragEnd(event) {
    draggedBlock = null;
    dropTargetBlock = null;
    // 모든 드래그 관련 클래스 제거
    document.querySelectorAll('.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  function handleDragOver(event, block) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'link';
    
    // 연결 가능한 조합인지 확인
    if (canConnect(draggedBlock, block)) {
      dropTargetBlock = block;
      event.currentTarget.classList.add('drag-over');
    }
  }

  function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
  }

  function handleDrop(event, targetBlock) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    if (draggedBlock && targetBlock && canConnect(draggedBlock, targetBlock)) {
      // 지문/해설을 문제에 드롭한 경우
      if ((draggedBlock.type === 'passage' || draggedBlock.type === 'explanation') && targetBlock.type === 'question') {
        toggleLinkBlock(draggedBlock, targetBlock.id);
      }
      // 문제를 지문/해설에 드롭한 경우
      else if (draggedBlock.type === 'question' && (targetBlock.type === 'passage' || targetBlock.type === 'explanation')) {
        toggleLinkBlock(targetBlock, draggedBlock.id);
      }
    }
  }

  function canConnect(source, target) {
    if (!source || !target || source.id === target.id) return false;
    
    // 지문/해설 -> 문제 또는 문제 -> 지문/해설만 가능
    return (
      ((source.type === 'passage' || source.type === 'explanation') && target.type === 'question') ||
      (source.type === 'question' && (target.type === 'passage' || target.type === 'explanation'))
    );
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
  }
  
  function goBack() {
    if (extractionStep === 'configure-blocks') {
      extractionStep = 'extract-blocks';
    } else {
      extractionStep = 'select-material';
    }
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
        const blocksToInsert = selectedBlocks.map(block => ({
          user_id: $user.id,
          material_id: selectedMaterial.id,
          title: block.title || `${block.type} ${block.id}`, // title 필드 추가
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
      
      // materials store 업데이트
      const questionCount = selectedBlocks.filter(b => b.type === 'question').length;
      const updates = {
        is_extracted: true,
        extracted_count: questionCount,
        extraction_date: new Date().toISOString()
      };
      
      await updateMaterial(selectedMaterial.id, updates);
      
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
    if (extractionStep === 'extract-blocks' && !isDrawing) {
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
          moveToNextField();
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
            </div>
          {/if}
        </div>
        
        <div class="breadcrumbs text-sm">
          <ul>
            <li><a href="/">홈</a></li>
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
              <div class="bg-gray-50 p-4 rounded-lg overflow-auto" style="max-height: 600px;">
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
              <div class="space-y-2 overflow-y-auto" style="max-height: 600px;">
                {#each selectedBlocks as block, index}
                  <div 
                    class="rect-block-item {dropTargetBlock?.id === block.id ? 'drag-over' : ''}" 
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, block)}
                    on:dragend={handleDragEnd}
                    on:dragover={(e) => handleDragOver(e, block)}
                    on:dragleave={handleDragLeave}
                    on:drop={(e) => handleDrop(e, block)}
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
                                    class="text-{linked.type === 'passage' ? 'secondary' : 'accent'}">
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
                              batchChangeType(type.value);
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
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="space-y-3">
              <!-- 체크된 항목 상태 표시 -->
              {#if checkedBlocks.size > 0}
                <div class="text-sm text-info">
                  {checkedBlocks.size}개 항목이 선택되었습니다.
                </div>
              {/if}
              
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
        
        <!-- 표 형식 편집기 -->
        <div class="card bg-base-100 shadow">
          <div class="card-body p-0">
            <div class="editable-table-container" tabindex="-1">
              <div class="overflow-x-auto" style="max-height: 600px;">
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
                                  <span class="badge badge-sm badge-{linkedBlock.type === 'passage' ? 'secondary' : 'accent'}">
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