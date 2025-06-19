<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials, formatFileSize, getFileTypeIcon } from '$lib/stores/materials.js';
  import { addBlock } from '$lib/stores/blocks.js';
  import { goto } from '$app/navigation';
  
  let selectedMaterial = null;
  let currentPage = 1;
  let totalPages = 10;
  let extractionMode = 'manual';
  let selectedBlocks = [];
  let nextBlockId = 1;
  let extractionStep = 'select-material';
  
  // 일괄 입력 변수들
  let bulkQuestionType = '';
  let bulkScore = '';
  let bulkDifficulty = '';
  
  // 표 네비게이션 상태
  let selectedCells = new Set(); // 선택된 셀들 "row,col" 형태
  let currentCell = { row: 0, col: 0 }; // 현재 포커스된 셀
  let isShiftPressed = false;
  let isCtrlPressed = false;
  let selectionStartCell = null;
  let tableElement = null;
  
  // 드래그 상태
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragEnd = { x: 0, y: 0 };
  let selectedBlockIds = [];
  
  // 블록 타입
  const blockTypes = [
    { value: 'question', label: '문제', icon: '❓', color: 'border-primary bg-primary/10' },
    { value: 'passage', label: '지문', icon: '📜', color: 'border-secondary bg-secondary/10' },
    { value: 'concept', label: '개념', icon: '💡', color: 'border-accent bg-accent/10' },
    { value: 'explanation', label: '해설', icon: '📝', color: 'border-info bg-info/10' }
  ];
  
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
  
  onMount(() => {
    if (browser && $user?.id) {
      fetchMaterials($user.id, 'original').then(() => {
        // URL 파라미터에서 materialId 확인
        const materialId = $page.url.searchParams.get('materialId');
        if (materialId) {
          // 해당 자료를 찾아서 자동으로 선택
          const material = $materials.find(m => m.id === materialId);
          if (material) {
            selectMaterial(material);
          }
        }
      });
    }
  });
  
  function selectMaterial(material) {
    selectedMaterial = material;
    extractionStep = 'extract-blocks';
    totalPages = material.pages || 10;
  }
  
  function handlePageChange(page) {
    currentPage = page;
  }
  
  function setExtractionMode(mode) {
    extractionMode = mode;
  }
  
  function autoExtractBlocks() {
    // AI 자동 추출 시뮬레이션 - 현재 페이지의 문제 영역을 자동으로 감지
    const autoBlocks = [];
    
    if (currentPage === 1) {
      autoBlocks.push(
        {
          id: `block-auto-${nextBlockId}`,
          type: 'question',
          title: `객관식 문제 1`,
          page: currentPage,
          selection: { x: 65, y: 335, width: 480, height: 85 },
          content: '다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은?',
          format: 'multiple_choice',
          answer: '① a &gt; 0',
          score: 3,
          difficulty: 'low',
          explanationUrl: '',
          tags: ['low'],
          linkedBlocks: [],
          extractedText: '다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은? ① a &gt; 0 ② a &lt; 0 ③ a = 0 ④ b &gt; 0 ⑤ c &gt; 0',
          selected: false
        },
        {
          id: `block-auto-${nextBlockId + 1}`,
          type: 'question',
          title: `주관식 문제 2`,
          page: currentPage,
          selection: { x: 65, y: 435, width: 480, height: 65 },
          content: '함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.',
          format: 'short_answer',
          answer: '-1',
          score: 4,
          difficulty: 'medium',
          explanationUrl: '',
          tags: ['medium'],
          linkedBlocks: [],
          extractedText: '함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.',
          selected: false
        }
      );
    } else if (currentPage === 2) {
      autoBlocks.push(
        {
          id: `block-auto-${nextBlockId}`,
          type: 'question',
          title: `서술형 문제 4`,
          page: currentPage,
          selection: { x: 65, y: 390, width: 480, height: 120 },
          content: '이차함수 f(x) = x² - 2x + k가 x축과 서로 다른 두 점에서 만날 조건을 구하고, 그 이유를 설명하시오.',
          format: 'essay',
          answer: 'k &lt; 1 (판별식 D &gt; 0 조건)',
          score: 10,
          difficulty: 'high',
          explanationUrl: '',
          tags: ['high'],
          linkedBlocks: [],
          extractedText: '이차함수 f(x) = x² - 2x + k가 x축과 서로 다른 두 점에서 만날 조건을 구하고, 그 이유를 설명하시오. (10점)',
          selected: false
        }
      );
    }
    
    selectedBlocks = [...selectedBlocks, ...autoBlocks];
    nextBlockId += autoBlocks.length;
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
    for (const block of selectedBlocks) {
      const blockData = {
        material_id: selectedMaterial.id,
        type: block.format || block.type,
        question: block.extractedText,
        correct_answer: block.answer || '',
        difficulty: 'medium',
        page_number: block.page,
        tags: block.tags || []
      };
      
      try {
        await addBlock($user.id, blockData);
      } catch (error) {
        console.error('Error adding block:', error);
      }
    }
    
    alert(`${selectedBlocks.length}개의 블록이 추출되었습니다!`);
    goto('/my-materials');
  }
  
  function getBlockTypeInfo(type) {
    return blockTypes.find(t => t.value === type) || blockTypes[0];
  }
  
  // 드래그 이벤트 핸들러들
  function handleMouseDown(e) {
    if (extractionMode !== 'manual') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    isDragging = true;
    dragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    dragEnd = { ...dragStart };
    e.preventDefault();
  }
  
  function handleMouseMove(e) {
    if (!isDragging || extractionMode !== 'manual') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    dragEnd = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  function handleMouseUp(e) {
    if (!isDragging || extractionMode !== 'manual') return;
    
    const width = Math.abs(dragEnd.x - dragStart.x);
    const height = Math.abs(dragEnd.y - dragStart.y);
    
    // 최소 크기 체크 (너무 작은 선택은 무시)
    if (width > 20 && height > 20) {
      createBlockFromSelection();
    }
    
    isDragging = false;
    dragStart = { x: 0, y: 0 };
    dragEnd = { x: 0, y: 0 };
  }
  
  function createBlockFromSelection() {
    const selection = {
      x: Math.min(dragStart.x, dragEnd.x),
      y: Math.min(dragStart.y, dragEnd.y),
      width: Math.abs(dragEnd.x - dragStart.x),
      height: Math.abs(dragEnd.y - dragStart.y)
    };
    
    // 선택된 영역에서 대략적인 텍스트 추출 (실제로는 OCR이나 PDF 파싱 필요)
    let extractedText = '';
    let blockType = 'question';
    
    // 위치에 따라 텍스트와 타입 추정
    if (selection.y < 200) {
      extractedText = '시험지 제목 영역';
      blockType = 'concept';
    } else if (selection.y < 350) {
      extractedText = '다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은?';
      blockType = 'question';
    } else if (selection.y < 500) {
      extractedText = '함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.';
      blockType = 'question';
    } else {
      extractedText = '선택된 영역의 텍스트';
      blockType = 'question';
    }
    
    const newBlock = {
      id: `block-manual-${nextBlockId}`,
      type: blockType,
      title: `블록 ${nextBlockId}`,
      page: currentPage,
      selection,
      content: extractedText,
      format: blockType === 'question' ? 'multiple_choice' : '',
      answer: '',
      score: 1,
      difficulty: '',
      explanationUrl: '',
      tags: [],
      linkedBlocks: [],
      extractedText,
      selected: false
    };
    
    selectedBlocks = [...selectedBlocks, newBlock];
    nextBlockId++;
  }
  
  function removeBlock(blockId) {
    selectedBlocks = selectedBlocks.filter(block => block.id !== blockId);
  }
  
  // 일괄 입력 함수
  function applyBulkValue(field, value) {
    if (!value) return;
    
    selectedBlocks = selectedBlocks.map(block => ({
      ...block,
      [field]: value
    }));
    
    // 입력 필드 초기화
    if (field === 'format') bulkQuestionType = '';
    if (field === 'score') bulkScore = '';
    if (field === 'difficulty') bulkDifficulty = '';
  }
  
  // 키보드 이벤트 핸들러
  function handleKeyDown(event) {
    const { key, shiftKey, ctrlKey, metaKey } = event;
    isShiftPressed = shiftKey;
    isCtrlPressed = ctrlKey || metaKey;
    
    const maxRow = selectedBlocks.length - 1;
    const maxCol = 4; // 유형, 정답, 배점, 난이도, 해설URL (5개 컬럼, 0-4)
    
    let newRow = currentCell.row;
    let newCol = currentCell.col;
    let shouldPreventDefault = true;
    
    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, currentCell.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(maxRow, currentCell.row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, currentCell.col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(maxCol, currentCell.col + 1);
        break;
      case 'Tab':
        if (shiftKey) {
          newCol = currentCell.col - 1;
          if (newCol < 0) {
            newCol = maxCol;
            newRow = Math.max(0, currentCell.row - 1);
          }
        } else {
          newCol = currentCell.col + 1;
          if (newCol > maxCol) {
            newCol = 0;
            newRow = Math.min(maxRow, currentCell.row + 1);
          }
        }
        break;
      case 'Enter':
        newRow = Math.min(maxRow, currentCell.row + 1);
        break;
      case 'Escape':
        selectedCells.clear();
        selectedCells = new Set();
        shouldPreventDefault = false;
        break;
      default:
        shouldPreventDefault = false;
    }
    
    if (shouldPreventDefault) {
      event.preventDefault();
      
      if (newRow !== currentCell.row || newCol !== currentCell.col) {
        moveToCell(newRow, newCol, shiftKey, ctrlKey || metaKey);
      }
    }
  }
  
  // 셀 이동 함수
  function moveToCell(row, col, extendSelection = false, addToSelection = false) {
    const previousCell = { ...currentCell };
    currentCell = { row, col };
    
    if (!extendSelection && !addToSelection) {
      // 단일 선택
      selectedCells.clear();
      selectedCells.add(`${row},${col}`);
      selectionStartCell = { row, col };
    } else if (extendSelection && selectionStartCell) {
      // Shift + 화살표: 범위 선택
      selectedCells.clear();
      const startRow = Math.min(selectionStartCell.row, row);
      const endRow = Math.max(selectionStartCell.row, row);
      const startCol = Math.min(selectionStartCell.col, col);
      const endCol = Math.max(selectionStartCell.col, col);
      
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          selectedCells.add(`${r},${c}`);
        }
      }
    } else if (addToSelection) {
      // Ctrl + 클릭: 개별 추가/제거
      const cellKey = `${row},${col}`;
      if (selectedCells.has(cellKey)) {
        selectedCells.delete(cellKey);
      } else {
        selectedCells.add(cellKey);
      }
    }
    
    selectedCells = new Set(selectedCells); // 리액티브 업데이트
    
    // 포커스를 해당 셀로 이동
    focusCell(row, col);
  }
  
  // 셀에 포커스 설정
  function focusCell(row, col) {
    const cellElement = tableElement?.querySelector(`[data-cell="${row}-${col}"]`);
    if (cellElement) {
      cellElement.focus();
    }
  }
  
  // 셀 클릭 핸들러
  function handleCellClick(event, row, col) {
    event.preventDefault();
    moveToCell(row, col, isShiftPressed, isCtrlPressed);
  }
  
  // 셀이 선택되어 있는지 확인
  function isCellSelected(row, col) {
    return selectedCells.has(`${row},${col}`);
  }
  
  // 현재 셀인지 확인
  function isCurrentCell(row, col) {
    return currentCell.row === row && currentCell.col === col;
  }
  
  // 선택된 셀들에 일괄 값 적용
  function applyValueToSelectedCells(field, value) {
    if (!value || selectedCells.size === 0) return;
    
    selectedBlocks = selectedBlocks.map((block, index) => {
      // 해당 행의 어떤 셀이라도 선택되어 있으면 값 적용
      const isRowSelected = Array.from(selectedCells).some(cellKey => {
        const [row] = cellKey.split(',').map(Number);
        return row === index;
      });
      
      if (isRowSelected) {
        return { ...block, [field]: value };
      }
      return block;
    });
  }
</script>

<svelte:head>
  <title>문항 추출 - Class Easy</title>
  <style>
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .rect-item {
      transition: all 0.2s ease;
    }
    
    .rect-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .rect-drag-icon {
      opacity: 0.6;
      transition: opacity 0.2s ease;
    }
    
    .rect-item:hover .rect-drag-icon {
      opacity: 1;
    }
    
    .editable-table {
      border-collapse: collapse;
    }
    
    .editable-table th {
      position: sticky;
      top: 0;
      z-index: 10;
      background: hsl(var(--b2));
      font-weight: 600;
    }
    
    .editable-table td,
    .editable-table th {
      border: 1px solid hsl(var(--bc) / 0.2);
    }
    
    .editable-table tbody tr:hover {
      background: hsl(var(--b2) / 0.5);
    }
    
    .editable-table input,
    .editable-table select {
      border: none;
      background: transparent;
      width: 100%;
    }
    
    .editable-table input:focus,
    .editable-table select:focus {
      background: hsl(var(--b1));
      border: 1px solid hsl(var(--p));
    }
  </style>
</svelte:head>

<div class="min-h-screen bg-base-200">
  <!-- 상단 헤더 -->
  <div class="bg-base-100 shadow-sm">
    <div class="container mx-auto px-4 py-4">
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
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
      <!-- 자료 선택 단계 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title mb-4">문항을 추출할 자료를 선택하세요</h2>
          
          {#if $materials.length === 0}
            <div class="text-center py-12">
              <div class="text-4xl mb-4">📁</div>
              <h3 class="text-lg font-medium mb-2">원본 자료가 없습니다</h3>
              <p class="text-base-content/70 mb-4">
                먼저 자료를 업로드해주세요
              </p>
              <a href="/upload" class="btn btn-primary">자료 올리기</a>
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
                      <div class="badge badge-primary badge-sm">원본</div>
                    </div>
                    
                    <h3 class="card-title text-sm mb-2">{material.title}</h3>
                    
                    <div class="text-xs text-base-content/70 space-y-1">
                      {#if material.file_size}
                        <p>{formatFileSize(material.file_size)}</p>
                      {/if}
                      {#if material.pages}
                        <p>{material.pages}페이지</p>
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
      <!-- 블록 추출 단계 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                    <button class="btn btn-primary btn-sm" on:click={autoExtractBlocks}>
                      자동 문항 추출
                    </button>
                  {/if}
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
              <div class="bg-gray-50 p-4 rounded-lg">
                <div 
                  class="bg-white shadow-lg mx-auto relative border-2 border-gray-200 select-none"
                  style="width: 100%; max-width: 595px; min-height: 600px;"
                  on:mousedown={handleMouseDown}
                  on:mousemove={handleMouseMove}
                  on:mouseup={handleMouseUp}
                  on:mouseleave={handleMouseUp}
                >
                  <!-- 드래그 선택 영역 -->
                  {#if isDragging}
                    <div 
                      class="absolute border-2 border-primary bg-primary/20 pointer-events-none z-10"
                      style="left: {Math.min(dragStart.x, dragEnd.x)}px; top: {Math.min(dragStart.y, dragEnd.y)}px; width: {Math.abs(dragEnd.x - dragStart.x)}px; height: {Math.abs(dragEnd.y - dragStart.y)}px;"
                    ></div>
                  {/if}
                  
                  <!-- 이미 선택된 블록들 표시 -->
                  {#each selectedBlocks.filter(block => block.page === currentPage) as block}
                    <div 
                      class="absolute border-2 bg-opacity-20 pointer-events-none z-5 {getBlockTypeInfo(block.type).color}"
                      style="left: {block.selection.x}px; top: {block.selection.y}px; width: {block.selection.width}px; height: {block.selection.height}px;"
                    >
                      <div class="absolute -top-6 left-0 text-xs font-medium px-2 py-1 bg-white border rounded shadow">
                        {getBlockTypeInfo(block.type).icon} {block.title}
                      </div>
                    </div>
                  {/each}
                  
                  <!-- 모의고사 시험지 콘텐츠 -->
                  <div class="p-8">
                    <!-- 시험지 헤더 -->
                    <div class="text-center mb-6 border-b-2 border-gray-800 pb-4">
                      <h1 class="text-xl font-bold">2024학년도 수학 모의고사</h1>
                      <div class="text-sm mt-2 space-y-1">
                        <p>제{currentPage}교시 - 수학영역</p>
                        <p class="text-xs text-gray-600">시간: 100분 / 배점: 100점</p>
                      </div>
                    </div>
                    
                    <!-- 문제 영역 -->
                    <div class="space-y-6">
                      <!-- 문제 1 -->
                      <div class="hover:bg-gray-50 p-2 rounded transition-colors">
                        <div class="flex items-start gap-3">
                          <span class="font-bold text-lg mt-1">1.</span>
                          <div class="flex-1">
                            <p class="font-medium mb-3">다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은?</p>
                            <div class="grid grid-cols-2 gap-2 ml-4">
                              <div class="text-sm">① a &gt; 0</div>
                              <div class="text-sm">② a &lt; 0</div>
                              <div class="text-sm">③ a = 0</div>
                              <div class="text-sm">④ b &gt; 0</div>
                              <div class="text-sm">⑤ c &gt; 0</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 문제 2 -->
                      <div class="hover:bg-gray-50 p-2 rounded transition-colors">
                        <div class="flex items-start gap-3">
                          <span class="font-bold text-lg mt-1">2.</span>
                          <div class="flex-1">
                            <p class="font-medium mb-3">함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.</p>
                            <div class="border border-gray-300 p-3 bg-gray-50">
                              <p class="text-sm text-gray-600">답: _____________</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 문제 3 -->
                      <div class="hover:bg-gray-50 p-2 rounded transition-colors">
                        <div class="flex items-start gap-3">
                          <span class="font-bold text-lg mt-1">3.</span>
                          <div class="flex-1">
                            <p class="font-medium mb-3">다음 그래프는 어떤 함수를 나타내는가?</p>
                            <div class="border border-gray-300 p-4 bg-gray-50 text-center">
                              <div class="w-32 h-24 mx-auto bg-white border border-gray-400 rounded flex items-center justify-center">
                                <span class="text-xs text-gray-500">[그래프 영역]</span>
                              </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2 ml-4 mt-3">
                              <div class="text-sm">① y = x²</div>
                              <div class="text-sm">② y = -x²</div>
                              <div class="text-sm">③ y = 2x²</div>
                              <div class="text-sm">④ y = x² + 1</div>
                              <div class="text-sm">⑤ y = (x-1)²</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- 서술형 문제 -->
                      {#if currentPage > 1}
                        <div class="border-t-2 border-gray-400 pt-4 mt-6">
                          <h3 class="font-bold text-center mb-4">서술형 문제</h3>
                          <div class="hover:bg-gray-50 p-2 rounded transition-colors">
                            <div class="flex items-start gap-3">
                              <span class="font-bold text-lg mt-1">4.</span>
                              <div class="flex-1">
                                <p class="font-medium mb-3">이차함수 f(x) = x² - 2x + k가 x축과 서로 다른 두 점에서 만날 조건을 구하고, 그 이유를 설명하시오. (10점)</p>
                                <div class="border border-gray-300 p-4 bg-gray-50 min-h-[100px]">
                                  <p class="text-sm text-gray-600 mb-2">풀이:</p>
                                  <div class="border-b border-gray-300 mb-2"></div>
                                  <div class="border-b border-gray-300 mb-2"></div>
                                  <div class="border-b border-gray-300 mb-2"></div>
                                  <div class="border-b border-gray-300"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                    
                    <!-- 시험지 하단 -->
                    <div class="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                      <p>- 끝 -</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-4 text-center">
                <p class="text-sm text-base-content/70">
                  {#if extractionMode === 'manual'}
                    <span class="font-medium">수동 선택 모드:</span> 문서에서 마우스를 드래그하여 문항 영역을 선택하세요
                  {:else}
                    <span class="font-medium">자동 추출 모드:</span> AI가 자동으로 문항을 감지하고 추출합니다
                  {/if}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 우측: 선택된 블록 관리 -->
        <div class="lg:col-span-1">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h3 class="card-title mb-4">선택된 블록 ({selectedBlocks.length})</h3>
              
              <div class="scrap-list-body">
                <div class="space-y-2">
                  {#each selectedBlocks as block, index}
                    <div 
                      class="rect-item bg-base-100 border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      draggable="true"
                      on:dragstart={(e) => {
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                    >
                      <div class="flex items-center gap-3">
                        <!-- 체크박스 -->
                        <div class="rect-checkbox">
                          <input 
                            type="checkbox" 
                            class="checkbox checkbox-sm checkbox-primary"
                            bind:checked={block.selected}
                          />
                        </div>
                        
                        <!-- 블록 제목과 페이지 -->
                        <div class="flex-1 flex items-center gap-2">
                          <span class="font-medium text-sm">{block.title}</span>
                          <span class="text-xs text-gray-500">({block.page}p)</span>
                        </div>
                        
                        <!-- 문제/지문 선택 버튼 -->
                        <div class="rc-segmented">
                          <div class="join">
                            <button 
                              class="btn btn-xs join-item {block.type === 'question' ? 'btn-primary' : 'btn-outline'}"
                              on:click={() => block.type = 'question'}
                            >
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 bg-primary rounded-full"></div>
                                <span class="text-xs">문제</span>
                              </div>
                            </button>
                            <button 
                              class="btn btn-xs join-item {block.type === 'passage' ? 'btn-secondary' : 'btn-outline'}"
                              on:click={() => block.type = 'passage'}
                            >
                              <div class="flex items-center gap-1">
                                <div class="w-2 h-2 bg-secondary rounded-full"></div>
                                <span class="text-xs">지문</span>
                              </div>
                            </button>
                          </div>
                        </div>
                        
                        <!-- 드래그 핸들 -->
                        <div class="rect-drag-icon cursor-move text-gray-400 hover:text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 15a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2zm0-4a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2z"></path>
                          </svg>
                        </div>
                        
                        <!-- 삭제 버튼 -->
                        <button 
                          class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-white"
                          on:click={() => removeBlock(block.id)}
                          title="블록 삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>
                      
                      <!-- 추출된 텍스트 미리보기 -->
                      <div class="mt-2 pl-8">
                        <p class="text-xs text-gray-600 line-clamp-2">
                          {block.extractedText}
                        </p>
                      </div>
                    </div>
                  {/each}
                  
                  {#if selectedBlocks.length === 0}
                    <div class="text-center py-8">
                      <div class="text-4xl mb-2">📝</div>
                      <p class="text-sm text-base-content/70 mb-2">
                        {#if extractionMode === 'manual'}
                          문서에서 드래그하여<br/>문항 영역을 선택하세요
                        {:else}
                          AI 자동 추출로<br/>문항을 감지하세요
                        {/if}
                      </p>
                      {#if extractionMode === 'auto'}
                        <button class="btn btn-primary btn-sm mt-2" on:click={autoExtractBlocks}>
                          자동 추출 시작
                        </button>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
              
              <!-- 하단 액션 버튼들 -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                <!-- 선택된 블록 액션 -->
                {#if selectedBlocks.some(block => block.selected)}
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-sm text-gray-600">
                      {selectedBlocks.filter(block => block.selected).length}개 선택됨
                    </span>
                    <button 
                      class="btn btn-outline btn-xs"
                      on:click={() => {
                        selectedBlocks.forEach(block => {
                          if (block.selected) block.type = 'question';
                        });
                      }}
                    >
                      문제로 변경
                    </button>
                    <button 
                      class="btn btn-outline btn-xs"
                      on:click={() => {
                        selectedBlocks.forEach(block => {
                          if (block.selected) block.type = 'passage';
                        });
                      }}
                    >
                      지문으로 변경
                    </button>
                    <button 
                      class="btn btn-error btn-xs"
                      on:click={() => {
                        selectedBlocks = selectedBlocks.filter(block => !block.selected);
                      }}
                    >
                      선택 삭제
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
      <!-- 2단계: 추가 정보 입력 -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">추가 정보 입력</h2>
            <p class="text-base-content/70">추출된 블록들의 세부 정보를 표에서 일괄 편집하세요</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline" on:click={goBack}>
              뒤로
            </button>
            <button class="btn btn-primary" on:click={finalizeExtraction}>
              추출 완료
            </button>
          </div>
        </div>
        
        <!-- 일괄 입력 컨트롤 -->
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="flex flex-wrap items-center gap-4 mb-4">
              <!-- 문제 유형 일괄 입력 -->
              <div class="flex items-center gap-2">
                <select class="select select-bordered select-sm" bind:value={bulkQuestionType}>
                  <option value="">문제유형</option>
                  {#each questionFormats as format}
                    <option value={format.value}>{format.label}</option>
                  {/each}
                </select>
                <button 
                  class="btn btn-outline btn-sm"
                  on:click={() => {
                    if (selectedCells.size > 0) {
                      applyValueToSelectedCells('format', bulkQuestionType);
                    } else {
                      applyBulkValue('format', bulkQuestionType);
                    }
                  }}
                  disabled={!bulkQuestionType}
                >
                  {selectedCells.size > 0 ? `선택된 ${selectedCells.size}개 셀` : '일괄'} 입력
                </button>
              </div>
              
              <!-- 배점 일괄 입력 -->
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1">
                  <span class="text-sm">배점</span>
                  <input 
                    type="number" 
                    class="input input-bordered input-sm w-16" 
                    placeholder="3"
                    bind:value={bulkScore}
                    min="1"
                  />
                </div>
                <button 
                  class="btn btn-outline btn-sm"
                  on:click={() => {
                    if (selectedCells.size > 0) {
                      applyValueToSelectedCells('score', bulkScore);
                    } else {
                      applyBulkValue('score', bulkScore);
                    }
                  }}
                  disabled={!bulkScore}
                >
                  {selectedCells.size > 0 ? `선택된 ${selectedCells.size}개 셀` : '일괄'} 입력
                </button>
              </div>
              
              <!-- 난이도 일괄 입력 -->
              <div class="flex items-center gap-2">
                <select class="select select-bordered select-sm" bind:value={bulkDifficulty}>
                  <option value="">난이도</option>
                  <option value="low">쉬움</option>
                  <option value="medium">보통</option>
                  <option value="high">어려움</option>
                </select>
                <button 
                  class="btn btn-outline btn-sm"
                  on:click={() => {
                    if (selectedCells.size > 0) {
                      applyValueToSelectedCells('difficulty', bulkDifficulty);
                    } else {
                      applyBulkValue('difficulty', bulkDifficulty);
                    }
                  }}
                  disabled={!bulkDifficulty}
                >
                  {selectedCells.size > 0 ? `선택된 ${selectedCells.size}개 셀` : '일괄'} 입력
                </button>
              </div>
              
              <div class="flex-1"></div>
              
              <!-- 도움말 -->
              <div class="flex items-center gap-1 text-sm text-base-content/70">
                <span>표 사용법</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2M0 12C0 5.373 5.373 0 12 0s12 5.373 12 12-5.373 12-12 12S0 18.627 0 12" clip-rule="evenodd"></path>
                  <path d="M13.082 9.701h-2V18.2h2zm-1.041-4.412c-.888 0-1.459.545-1.459 1.38 0 .844.571 1.388 1.459 1.388S13.5 7.513 13.5 6.669c0-.835-.571-1.38-1.459-1.38"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 편집 가능한 표 -->
        <div class="card bg-base-100 shadow">
          <div class="card-body p-0">
            <div 
              class="editable-table-container"
              on:keydown={handleKeyDown}
              tabindex="-1"
            >
              <div class="overflow-x-auto" style="max-height: 600px;">
                <table class="editable-table w-full" bind:this={tableElement}>
                  <thead class="sticky top-0 bg-base-200">
                    <tr>
                      <th class="p-3 text-left border-b" style="width: 80px;">문제</th>
                      <th class="p-3 text-left border-b" style="width: 120px;">유형 *</th>
                      <th class="p-3 text-left border-b" style="width: 200px;">
                        <div class="flex items-center gap-2">
                          <span>정답 *</span>
                          <div class="tooltip tooltip-bottom" data-tip="버티컬 바 | 로 복수 정답 입력 (ex. 3|4)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2M0 12C0 5.373 5.373 0 12 0s12 5.373 12 12-5.373 12-12 12S0 18.627 0 12" clip-rule="evenodd"></path>
                              <path d="M13.082 9.701h-2V18.2h2zm-1.041-4.412c-.888 0-1.459.545-1.459 1.38 0 .844.571 1.388 1.459 1.388S13.5 7.513 13.5 6.669c0-.835-.571-1.38-1.459-1.38"></path>
                            </svg>
                          </div>
                        </div>
                      </th>
                      <th class="p-3 text-left border-b" style="width: 80px;">배점 *</th>
                      <th class="p-3 text-left border-b" style="width: 100px;">난이도</th>
                      <th class="p-3 text-left border-b" style="width: 300px;">해설 URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each selectedBlocks as block, index}
                      <tr class="hover:bg-base-50">
                        <!-- 문제 번호 -->
                        <td class="p-3 border-b bg-base-100 font-medium text-center">
                          {index + 1}
                        </td>
                        
                        <!-- 문제 유형 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 0) ? 'bg-primary/20' : ''} {isCurrentCell(index, 0) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 0)}
                        >
                          <select 
                            class="select select-bordered select-sm w-full bg-transparent"
                            bind:value={block.format}
                            data-cell="{index}-0"
                            tabindex="-1"
                          >
                            <option value="">선택</option>
                            {#each questionFormats as format}
                              <option value={format.value}>{format.label}</option>
                            {/each}
                          </select>
                        </td>
                        
                        <!-- 정답 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 1) ? 'bg-primary/20' : ''} {isCurrentCell(index, 1) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 1)}
                        >
                          <input 
                            type="text" 
                            class="input input-bordered input-sm w-full bg-transparent"
                            bind:value={block.answer}
                            placeholder="정답 입력"
                            data-cell="{index}-1"
                            tabindex="-1"
                          />
                        </td>
                        
                        <!-- 배점 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 2) ? 'bg-primary/20' : ''} {isCurrentCell(index, 2) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 2)}
                        >
                          <input 
                            type="number" 
                            class="input input-bordered input-sm w-full bg-transparent"
                            bind:value={block.score}
                            placeholder="3"
                            min="1"
                            data-cell="{index}-2"
                            tabindex="-1"
                          />
                        </td>
                        
                        <!-- 난이도 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 3) ? 'bg-primary/20' : ''} {isCurrentCell(index, 3) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 3)}
                        >
                          <select 
                            class="select select-bordered select-sm w-full bg-transparent"
                            bind:value={block.difficulty}
                            data-cell="{index}-3"
                            tabindex="-1"
                          >
                            <option value="">선택</option>
                            <option value="low">쉬움</option>
                            <option value="medium">보통</option>
                            <option value="high">어려움</option>
                          </select>
                        </td>
                        
                        <!-- 해설 URL -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 4) ? 'bg-primary/20' : ''} {isCurrentCell(index, 4) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 4)}
                        >
                          <input 
                            type="url" 
                            class="input input-bordered input-sm w-full bg-transparent"
                            bind:value={block.explanationUrl}
                            placeholder="https://"
                            data-cell="{index}-4"
                            tabindex="-1"
                          />
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- 표 하단 요약 정보 -->
            <div class="p-4 border-t bg-base-50">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-4">
                  <span>총 {selectedBlocks.length}개 문항</span>
                  <span>필수 입력: {selectedBlocks.filter(b => b.format && b.answer && b.score).length}/{selectedBlocks.length}</span>
                  {#if selectedCells.size > 0}
                    <span class="text-primary font-medium">선택된 셀: {selectedCells.size}개</span>
                  {/if}
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