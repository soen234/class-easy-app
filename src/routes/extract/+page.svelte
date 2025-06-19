<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials } from '$lib/stores/materials.js';
  import { addBlock } from '$lib/stores/blocks.js';
  
  // State variables
  let extractionStep = 'select-material';
  let selectedMaterial = null;
  let selectedBlocks = [];
  let currentPage = 1;
  let totalPages = 1;
  let viewScale = 1;
  let extractionMode = 'manual'; // 'manual' or 'auto'
  let isSelecting = false;
  let selectionBox = null;
  let startPoint = null;
  let nextBlockId = 1;
  
  // 블록 타입
  const blockTypes = [
    { value: 'question', label: '문항', color: 'primary' },
    { value: 'passage', label: '지문', color: 'secondary' },
    { value: 'concept', label: '개념', color: 'info' },
    { value: 'explanation', label: '해설', color: 'success' }
  ];
  
  // 문제 유형 옵션
  const questionFormats = [
    { value: 'multiple_choice', label: '객관식' },
    { value: 'short_answer', label: '단답형' },
    { value: 'essay', label: '서술형' },
    { value: 'true_false', label: 'O/X' }
  ];
  
  // 추가 정보 입력을 위한 상태
  let bulkBlockType = '';
  let bulkQuestionType = '';
  let bulkScore = '';
  let bulkDifficulty = '';
  let customTagInput = '';
  
  // 표 편집을 위한 상태
  let currentCell = { row: 0, col: 0 };
  let selectedCells = new Set();
  let selectionStartCell = null;
  let isShiftPressed = false;
  let isCtrlPressed = false;
  let tableElement = null;
  
  // Drag and drop
  let draggedBlockId = null;
  let dragOverBlockId = null;
  
  // Mouse positions
  let mouseX = 0;
  let mouseY = 0;
  
  // PDF dimensions
  const pdfPageWidth = 595;
  const pdfPageHeight = 842;
  
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
          title: `문항 ${selectedBlocks.filter(b => b.type === 'question').length + 1}`,
          page: currentPage,
          selection: { x: 65, y: 335, width: 480, height: 85 },
          content: '다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은?',
          format: 'multiple_choice',
          answer: '① a &gt; 0',
          score: 3,
          difficulty: 'medium',
          explanationUrl: '',
          tags: ['이차함수'],
          customTags: [],
          linkedQuestions: [],
          extractedText: '다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은? ① a &gt; 0 ② a &lt; 0 ③ a = 0 ④ b &gt; 0 ⑤ c &gt; 0',
          selected: false
        },
        {
          id: `block-auto-${nextBlockId + 1}`,
          type: 'question',
          title: `문항 ${selectedBlocks.filter(b => b.type === 'question').length + 2}`,
          page: currentPage,
          selection: { x: 65, y: 435, width: 480, height: 65 },
          content: '함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.',
          format: 'short_answer',
          answer: '-1',
          score: 4,
          difficulty: 'medium',
          explanationUrl: '',
          tags: ['최솟값'],
          customTags: [],
          linkedQuestions: [],
          extractedText: '함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.',
          selected: false
        }
      );
    } else if (currentPage === 2) {
      autoBlocks.push(
        {
          id: `block-auto-${nextBlockId}`,
          type: 'question',
          title: `문항 ${selectedBlocks.filter(b => b.type === 'question').length + 1}`,
          page: currentPage,
          selection: { x: 65, y: 390, width: 480, height: 120 },
          content: '이차함수 f(x) = x² - 2x + k가 x축과 서로 다른 두 점에서 만날 조건을 구하고, 그 이유를 설명하시오.',
          format: 'essay',
          answer: 'k &lt; 1 (판별식 D &gt; 0 조건)',
          score: 10,
          difficulty: 'hard',
          explanationUrl: '',
          tags: ['판별식'],
          customTags: [],
          linkedQuestions: [],
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
        type: block.type,
        subtype: block.format,
        content: block.extractedText,
        correct_answer: block.answer || '',
        difficulty: block.difficulty || 'medium',
        page_number: block.page,
        tags: block.tags || [],
        custom_tags: block.customTags || [],
        linked_questions: block.linkedQuestions || []
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
  
  // Manual extraction functions
  function startSelection(event) {
    if (extractionMode !== 'manual') return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    isSelecting = true;
    startPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    selectionBox = {
      x: startPoint.x,
      y: startPoint.y,
      width: 0,
      height: 0
    };
  }
  
  function updateSelection(event) {
    if (!isSelecting || !startPoint) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    selectionBox = {
      x: Math.min(startPoint.x, currentX),
      y: Math.min(startPoint.y, currentY),
      width: Math.abs(currentX - startPoint.x),
      height: Math.abs(currentY - startPoint.y)
    };
    
    mouseX = currentX;
    mouseY = currentY;
  }
  
  function endSelection(event) {
    if (!isSelecting || !selectionBox || selectionBox.width < 10 || selectionBox.height < 10) {
      isSelecting = false;
      selectionBox = null;
      return;
    }
    
    // 새 블록 추가
    const newBlock = {
      id: `block-${nextBlockId++}`,
      type: 'question',
      title: `문항 ${selectedBlocks.filter(b => b.type === 'question').length + 1}`,
      page: currentPage,
      selection: { ...selectionBox },
      content: '',
      format: '',
      answer: '',
      score: '',
      difficulty: '',
      explanationUrl: '',
      tags: [],
      customTags: [],
      linkedQuestions: [],
      extractedText: '추출된 텍스트가 여기에 표시됩니다...',
      selected: false
    };
    
    selectedBlocks = [...selectedBlocks, newBlock];
    isSelecting = false;
    selectionBox = null;
  }
  
  function removeBlock(blockId) {
    selectedBlocks = selectedBlocks.filter(block => block.id !== blockId);
  }
  
  // 블록 병합 함수
  function mergeSelectedBlocks() {
    const selected = selectedBlocks.filter(b => b.selected);
    if (selected.length < 2) return;
    
    // 병합된 블록 생성
    const mergedBlock = {
      id: `block-merged-${nextBlockId++}`,
      type: selected[0].type,
      title: `병합된 블록 (${selected.map(b => b.title).join(' + ')})`,
      page: selected[0].page,
      selection: {
        x: Math.min(...selected.map(b => b.selection.x)),
        y: Math.min(...selected.map(b => b.selection.y)),
        width: Math.max(...selected.map(b => b.selection.x + b.selection.width)) - Math.min(...selected.map(b => b.selection.x)),
        height: Math.max(...selected.map(b => b.selection.y + b.selection.height)) - Math.min(...selected.map(b => b.selection.y))
      },
      content: selected.map(b => b.content).join('\n'),
      format: selected[0].format,
      answer: selected[0].answer,
      score: selected.reduce((sum, b) => sum + (parseInt(b.score) || 0), 0).toString(),
      difficulty: selected[0].difficulty,
      explanationUrl: selected[0].explanationUrl,
      tags: [...new Set(selected.flatMap(b => b.tags))],
      customTags: [...new Set(selected.flatMap(b => b.customTags))],
      linkedQuestions: [...new Set(selected.flatMap(b => b.linkedQuestions))],
      extractedText: selected.map(b => b.extractedText).join('\n'),
      selected: false,
      isMerged: true,
      originalBlocks: selected.map(b => b.id)
    };
    
    // 선택된 블록 제거하고 병합된 블록 추가
    selectedBlocks = selectedBlocks.filter(b => !b.selected);
    selectedBlocks = [...selectedBlocks, mergedBlock];
  }
  
  // 블록 분리 함수
  function splitSelectedBlocks() {
    const selected = selectedBlocks.filter(b => b.selected && b.isMerged);
    if (selected.length === 0) return;
    
    // 분리된 블록들을 원래대로 복원
    const restoredBlocks = [];
    selected.forEach(mergedBlock => {
      // 간단한 분리 로직 - 실제로는 원본 정보를 저장해둬야 함
      const parts = mergedBlock.title.match(/\((.*?)\)$/)?.[1]?.split(' + ') || [];
      parts.forEach((partTitle, index) => {
        restoredBlocks.push({
          id: `block-split-${nextBlockId++}`,
          type: mergedBlock.type,
          title: partTitle || `분리된 블록 ${index + 1}`,
          page: mergedBlock.page,
          selection: {
            x: mergedBlock.selection.x,
            y: mergedBlock.selection.y + (index * 50),
            width: mergedBlock.selection.width,
            height: 50
          },
          content: '',
          format: mergedBlock.format,
          answer: '',
          score: '',
          difficulty: mergedBlock.difficulty,
          explanationUrl: '',
          tags: mergedBlock.tags,
          customTags: mergedBlock.customTags,
          linkedQuestions: [],
          extractedText: '',
          selected: false
        });
      });
    });
    
    // 병합된 블록 제거하고 분리된 블록 추가
    selectedBlocks = selectedBlocks.filter(b => !selected.includes(b));
    selectedBlocks = [...selectedBlocks, ...restoredBlocks];
  }
  
  // Drag and drop functions
  function handleDragStart(event, blockId) {
    draggedBlockId = blockId;
    event.dataTransfer.effectAllowed = 'move';
  }
  
  function handleDragOver(event, blockId) {
    event.preventDefault();
    dragOverBlockId = blockId;
  }
  
  function handleDrop(event) {
    event.preventDefault();
    
    if (draggedBlockId && dragOverBlockId && draggedBlockId !== dragOverBlockId) {
      const draggedIndex = selectedBlocks.findIndex(b => b.id === draggedBlockId);
      const dropIndex = selectedBlocks.findIndex(b => b.id === dragOverBlockId);
      
      if (draggedIndex !== -1 && dropIndex !== -1) {
        const newBlocks = [...selectedBlocks];
        const [removed] = newBlocks.splice(draggedIndex, 1);
        newBlocks.splice(dropIndex, 0, removed);
        selectedBlocks = newBlocks;
      }
    }
    
    draggedBlockId = null;
    dragOverBlockId = null;
  }
  
  // 일괄 입력 함수
  function applyBulkValue(field, value) {
    if (!value) return;
    
    selectedBlocks = selectedBlocks.map(block => ({
      ...block,
      [field]: value
    }));
    
    // 입력 필드 초기화
    if (field === 'type') bulkBlockType = '';
    if (field === 'format') bulkQuestionType = '';
    if (field === 'score') bulkScore = '';
    if (field === 'difficulty') bulkDifficulty = '';
  }
  
  // 키보드 이벤트 핸들러
  function handleKeyDown(event) {
    const { key, shiftKey, ctrlKey, metaKey, target } = event;
    isShiftPressed = shiftKey;
    isCtrlPressed = ctrlKey || metaKey;
    
    const maxRow = selectedBlocks.length - 1;
    const maxCol = 5; // 타입(-1), 문항유형(0), 정답(1), 배점(2), 난이도(3), 연결(4), 태그(5)
    const minCol = -1; // 타입 컬럼부터 시작
    
    let newRow = currentCell.row;
    let newCol = currentCell.col;
    let shouldPreventDefault = true;
    
    // 드롭다운 처리
    if (target.tagName === 'SELECT' && key === 'Enter') {
      return; // 드롭다운에서 엔터키 처리는 별도로
    }
    
    switch (key) {
      case 'ArrowUp':
        newRow = Math.max(0, currentCell.row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(maxRow, currentCell.row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(minCol, currentCell.col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(maxCol, currentCell.col + 1);
        break;
      case 'Tab':
        if (shiftKey) {
          newCol = currentCell.col - 1;
          if (newCol < minCol) {
            newCol = maxCol;
            newRow = Math.max(0, currentCell.row - 1);
          }
        } else {
          newCol = currentCell.col + 1;
          if (newCol > maxCol) {
            newCol = minCol;
            newRow = Math.min(maxRow, currentCell.row + 1);
          }
        }
        break;
      case 'Enter':
        if (target.tagName !== 'SELECT') {
          newRow = Math.min(maxRow, currentCell.row + 1);
        }
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
    
    // 선택된 셀로 포커스 이동
    const targetCell = tableElement?.querySelector(`[data-cell="${row}-${col}"]`);
    if (targetCell) {
      targetCell.focus();
    }
    
    // 리액티브 업데이트 트리거
    selectedCells = new Set(selectedCells);
  }
  
  // 다음 셀로 이동
  function moveToNextCell(row, col) {
    const maxRow = selectedBlocks.length - 1;
    const maxCol = 5;
    const minCol = -1;
    
    let newCol = col + 1;
    let newRow = row;
    
    if (newCol > maxCol) {
      newCol = minCol;
      newRow = Math.min(maxRow, row + 1);
    }
    
    moveToCell(newRow, newCol);
  }
  
  // 셀 클릭 이벤트
  function handleCellClick(event, row, col) {
    if (event.shiftKey && selectionStartCell) {
      // Shift + 클릭: 범위 선택
      moveToCell(row, col, true, false);
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + 클릭: 다중 선택
      moveToCell(row, col, false, true);
    } else {
      // 일반 클릭: 단일 선택
      moveToCell(row, col, false, false);
    }
  }
  
  // 선택된 셀에 값 적용
  function applyValueToSelectedCells(field, value) {
    if (!value || selectedCells.size === 0) return;
    
    // field에 따른 컬럼 번호 결정
    let targetCol;
    if (field === 'type') targetCol = -1;
    else if (field === 'format') targetCol = 0;
    else if (field === 'score') targetCol = 2;
    else if (field === 'difficulty') targetCol = 3;
    
    selectedCells.forEach(cellKey => {
      const [row, col] = cellKey.split(',').map(Number);
      
      // 해당 컬럼의 셀만 업데이트
      if (col === targetCol && selectedBlocks[row]) {
        // 타입 변경 시 format 초기화
        if (field === 'type' && value !== 'question') {
          selectedBlocks[row] = {
            ...selectedBlocks[row],
            type: value,
            format: '',
            answer: '',
            score: '',
            difficulty: ''
          };
        } else {
          selectedBlocks[row] = {
            ...selectedBlocks[row],
            [field]: value
          };
        }
      }
    });
    
    // 리액티브 업데이트
    selectedBlocks = [...selectedBlocks];
  }
  
  // 셀 선택 여부 확인
  function isCellSelected(row, col) {
    return selectedCells.has(`${row},${col}`);
  }
  
  // 현재 포커스된 셀인지 확인
  function isCurrentCell(row, col) {
    return currentCell.row === row && currentCell.col === col;
  }
</script>

<svelte:head>
  <title>문항 추출 - Class Easy</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
  <div class="container mx-auto px-4 py-6">
    <!-- 헤더 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-2">문항 추출</h1>
      <div class="breadcrumbs text-sm">
        <ul>
          <li><a href="/">홈</a></li>
          <li><a href="/my-materials">내 자료</a></li>
          <li>문항 추출</li>
        </ul>
      </div>
    </div>
    
    {#if extractionStep === 'select-material'}
      <!-- 1단계: 자료 선택 -->
      <div class="card bg-base-100 shadow-xl">
        <div class="card-body">
          <h2 class="card-title mb-4">문항을 추출할 자료를 선택하세요</h2>
          
          {#if $materials.length === 0}
            <div class="text-center py-8">
              <p class="text-base-content/70 mb-4">업로드된 자료가 없습니다.</p>
              <a href="/my-materials" class="btn btn-primary">자료 업로드하기</a>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each $materials as material}
                <div 
                  class="card bg-base-200 hover:shadow-lg transition-shadow cursor-pointer"
                  on:click={() => selectMaterial(material)}
                >
                  <div class="card-body">
                    <h3 class="card-title text-lg">{material.title}</h3>
                    <div class="flex gap-2 mb-2">
                      <span class="badge badge-outline">{material.subject}</span>
                      <span class="badge badge-outline">{material.grade}</span>
                    </div>
                    <p class="text-sm text-base-content/70">
                      {material.pages || 0} 페이지
                    </p>
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
      <!-- 2단계: 블록 추출 -->
      <div class="grid grid-cols-12 gap-4">
        <!-- PDF 뷰어 영역 -->
        <div class="col-span-8">
          <div class="card bg-base-100 shadow-xl h-full">
            <div class="card-body p-4">
              <!-- 툴바 -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <button 
                    class="btn btn-sm"
                    disabled={currentPage <= 1}
                    on:click={() => handlePageChange(currentPage - 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                    </svg>
                  </button>
                  <span class="text-sm font-medium">{currentPage} / {totalPages}</span>
                  <button 
                    class="btn btn-sm"
                    disabled={currentPage >= totalPages}
                    on:click={() => handlePageChange(currentPage + 1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                    </svg>
                  </button>
                </div>
                
                <!-- 추출 모드 선택 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium">추출 모드:</span>
                  <div class="join">
                    <button 
                      class="btn btn-sm join-item {extractionMode === 'manual' ? 'btn-active' : ''}"
                      on:click={() => setExtractionMode('manual')}
                    >
                      수동
                    </button>
                    <button 
                      class="btn btn-sm join-item {extractionMode === 'auto' ? 'btn-active' : ''}"
                      on:click={() => setExtractionMode('auto')}
                    >
                      AI 자동
                    </button>
                  </div>
                  {#if extractionMode === 'auto'}
                    <button class="btn btn-primary btn-sm ml-2" on:click={autoExtractBlocks}>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                      </svg>
                      자동으로 추출하기
                    </button>
                  {/if}
                </div>
                
                <!-- 확대/축소 -->
                <div class="flex items-center gap-2">
                  <button class="btn btn-sm btn-ghost" on:click={() => viewScale = Math.max(0.5, viewScale - 0.1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                  </button>
                  <span class="text-sm">{Math.round(viewScale * 100)}%</span>
                  <button class="btn btn-sm btn-ghost" on:click={() => viewScale = Math.min(2, viewScale + 0.1)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- PDF 페이지 -->
              <div class="relative overflow-auto bg-gray-100 rounded-lg" style="height: 700px;">
                <div 
                  class="relative mx-auto bg-white shadow-lg select-none"
                  style="width: {pdfPageWidth * viewScale}px; height: {pdfPageHeight * viewScale}px; transform-origin: top center;"
                  on:mousedown={startSelection}
                  on:mousemove={updateSelection}
                  on:mouseup={endSelection}
                >
                  <!-- PDF 콘텐츠 플레이스홀더 -->
                  <div class="absolute inset-0 p-16" style="transform: scale({viewScale});">
                    <h2 class="text-2xl font-bold mb-4">수학 문제집 - {selectedMaterial?.title}</h2>
                    <p class="text-sm text-gray-600 mb-8">페이지 {currentPage}</p>
                    
                    {#if currentPage === 1}
                      <div class="space-y-6">
                        <div class="border-b pb-4">
                          <p class="font-medium mb-2">1. 다음 중 이차함수 f(x) = ax² + bx + c의 그래프가 아래로 볼록한 조건은?</p>
                          <div class="pl-4 space-y-1 text-sm">
                            <p>① a &gt; 0</p>
                            <p>② a &lt; 0</p>
                            <p>③ a = 0</p>
                            <p>④ b &gt; 0</p>
                            <p>⑤ c &gt; 0</p>
                          </div>
                        </div>
                        
                        <div class="border-b pb-4">
                          <p class="font-medium mb-2">2. 함수 f(x) = x² - 4x + 3의 최솟값을 구하시오.</p>
                          <div class="pl-4 mt-2">
                            <p class="text-sm text-gray-600">풀이:</p>
                          </div>
                        </div>
                        
                        <div class="bg-blue-50 p-4 rounded">
                          <p class="font-medium text-blue-800 mb-2">💡 핵심 개념</p>
                          <p class="text-sm">이차함수의 그래프가 아래로 볼록하려면 이차항의 계수가 양수여야 합니다.</p>
                        </div>
                      </div>
                    {:else if currentPage === 2}
                      <div class="space-y-6">
                        <div class="bg-gray-50 p-4 rounded mb-4">
                          <p class="font-medium mb-2">※ 다음 지문을 읽고 물음에 답하시오. (3~4)</p>
                          <p class="text-sm">이차함수 f(x) = ax² + bx + c (a ≠ 0)의 그래프는 포물선이며, a의 부호에 따라 아래로 볼록하거나 위로 볼록한 형태를 가진다.</p>
                        </div>
                        
                        <div class="border-b pb-4">
                          <p class="font-medium mb-2">3. 위 지문의 함수에서 a = 1, b = -2, c = 3일 때, 꼭짓점의 좌표를 구하시오.</p>
                        </div>
                        
                        <div class="border-b pb-4">
                          <p class="font-medium mb-2">4. 이차함수 f(x) = x² - 2x + k가 x축과 서로 다른 두 점에서 만날 조건을 구하고, 그 이유를 설명하시오. (10점)</p>
                          <div class="pl-4 mt-4 space-y-2">
                            <p class="text-sm text-gray-600">조건:</p>
                            <p class="text-sm text-gray-600">이유:</p>
                          </div>
                        </div>
                      </div>
                    {/if}
                  </div>
                  
                  <!-- 선택된 영역 표시 -->
                  {#each selectedBlocks.filter(b => b.page === currentPage) as block}
                    <div 
                      class="absolute border-2 transition-all duration-200 {block.selected ? 'ring-2 ring-primary ring-offset-2' : ''}"
                      style="
                        border-color: {getBlockTypeInfo(block.type).color === 'primary' ? '#570df8' : 
                                      getBlockTypeInfo(block.type).color === 'secondary' ? '#f000b8' :
                                      getBlockTypeInfo(block.type).color === 'info' ? '#37cdbe' :
                                      getBlockTypeInfo(block.type).color === 'success' ? '#36d399' : '#999'};
                        background-color: {block.selected ? 
                          (getBlockTypeInfo(block.type).color === 'primary' ? 'rgba(87, 13, 248, 0.2)' : 
                           getBlockTypeInfo(block.type).color === 'secondary' ? 'rgba(240, 0, 184, 0.2)' :
                           getBlockTypeInfo(block.type).color === 'info' ? 'rgba(55, 205, 190, 0.2)' :
                           getBlockTypeInfo(block.type).color === 'success' ? 'rgba(54, 211, 153, 0.2)' : 'rgba(153, 153, 153, 0.2)') :
                          (getBlockTypeInfo(block.type).color === 'primary' ? 'rgba(87, 13, 248, 0.1)' : 
                           getBlockTypeInfo(block.type).color === 'secondary' ? 'rgba(240, 0, 184, 0.1)' :
                           getBlockTypeInfo(block.type).color === 'info' ? 'rgba(55, 205, 190, 0.1)' :
                           getBlockTypeInfo(block.type).color === 'success' ? 'rgba(54, 211, 153, 0.1)' : 'rgba(153, 153, 153, 0.1)')};
                        left: {block.selection.x * viewScale}px; 
                        top: {block.selection.y * viewScale}px; 
                        width: {block.selection.width * viewScale}px; 
                        height: {block.selection.height * viewScale}px;
                      "
                    >
                      <div class="absolute -top-6 left-0 text-xs font-medium whitespace-nowrap px-1 py-0.5 rounded"
                           style="background-color: {getBlockTypeInfo(block.type).color === 'primary' ? '#570df8' : 
                                                     getBlockTypeInfo(block.type).color === 'secondary' ? '#f000b8' :
                                                     getBlockTypeInfo(block.type).color === 'info' ? '#37cdbe' :
                                                     getBlockTypeInfo(block.type).color === 'success' ? '#36d399' : '#999'};
                                  color: white;">
                        {block.title}
                      </div>
                    </div>
                  {/each}
                  
                  <!-- 현재 선택 중인 영역 -->
                  {#if isSelecting && selectionBox}
                    <div 
                      class="absolute border-2 border-primary border-dashed bg-primary/10"
                      style="
                        left: {selectionBox.x * viewScale}px; 
                        top: {selectionBox.y * viewScale}px; 
                        width: {selectionBox.width * viewScale}px; 
                        height: {selectionBox.height * viewScale}px;
                      "
                    />
                  {/if}
                  
                  <!-- 마우스 좌표 표시 -->
                  {#if extractionMode === 'manual' && isSelecting}
                    <div class="absolute bg-black text-white text-xs px-2 py-1 rounded pointer-events-none"
                         style="left: {mouseX * viewScale + 10}px; top: {mouseY * viewScale + 10}px;">
                      {Math.round(mouseX)}, {Math.round(mouseY)}
                    </div>
                  {/if}
                </div>
              </div>
              
              <!-- 도움말 -->
              <div class="mt-4 text-sm text-base-content/70">
                {#if extractionMode === 'manual'}
                  <p>📌 마우스로 드래그하여 문항 영역을 선택하세요. 선택한 영역은 오른쪽 패널에서 관리할 수 있습니다.</p>
                {:else}
                  <p>🤖 AI가 자동으로 문항을 감지합니다. '자동 추출 시작' 버튼을 클릭하세요.</p>
                {/if}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 사이드 패널 -->
        <div class="col-span-4">
          <div class="card bg-base-100 shadow-xl h-full">
            <div class="card-body p-4">
              <div class="flex items-center justify-between mb-4 border-b pb-2">
                <div class="flex items-center gap-3">
                  <input 
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selectedBlocks.length > 0 && selectedBlocks.every(block => block.selected)}
                    on:change={(e) => {
                      const checked = e.target.checked;
                      selectedBlocks.forEach(block => {
                        block.selected = checked;
                      });
                      selectedBlocks = [...selectedBlocks];
                    }}
                  />
                  <h3 class="font-bold text-lg">추출된 블록</h3>
                </div>
                <div class="flex items-center gap-2">
                  {#if selectedBlocks.some(b => b.selected)}
                    <button 
                      class="btn btn-ghost btn-xs"
                      on:click={mergeSelectedBlocks}
                      disabled={selectedBlocks.filter(b => b.selected).length < 2}
                    >
                      병합
                    </button>
                    <div class="divider divider-horizontal mx-0"></div>
                    <button 
                      class="btn btn-ghost btn-xs"
                      on:click={splitSelectedBlocks}
                      disabled={!selectedBlocks.some(b => b.selected && b.isMerged)}
                    >
                      분리
                    </button>
                    <div class="divider divider-horizontal mx-0"></div>
                    <button 
                      class="btn btn-ghost btn-xs text-error"
                      on:click={() => {
                        selectedBlocks = selectedBlocks.filter(b => !b.selected);
                      }}
                    >
                      삭제
                    </button>
                  {/if}
                </div>
              </div>
              
              <!-- 추출된 블록 목록 -->
              <div class="space-y-2 overflow-y-auto" style="max-height: 600px;">
                {#each selectedBlocks as block, index (block.id)}
                  <div 
                    class="rect-block-item {dragOverBlockId === block.id ? 'ring-2 ring-primary' : ''}"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, block.id)}
                    on:dragover={(e) => handleDragOver(e, block.id)}
                    on:drop={handleDrop}
                    on:dragend={() => {
                      draggedBlockId = null;
                      dragOverBlockId = null;
                    }}
                  >
                    <div class="space-y-2">
                      <!-- 첫 번째 줄: 체크박스, 블록 번호, 블록 타입 선택 버튼들, 삭제 버튼 -->
                      <div class="flex items-center gap-2">
                        <!-- 체크박스 -->
                        <input 
                          type="checkbox" 
                          class="checkbox checkbox-sm checkbox-primary"
                          bind:checked={block.selected}
                        />
                        
                        <!-- 블록 번호와 페이지 -->
                        <span class="font-medium text-sm min-w-[80px]">{block.title} ({block.page}p)</span>
                        
                        <!-- 블록 타입 선택 버튼들 -->
                        <div class="flex gap-1">
                          {#each blockTypes as blockType}
                            <button 
                              class="btn btn-xs {block.type === blockType.value ? `btn-${blockType.color}` : 'btn-ghost'}"
                              on:click={() => {
                                block.type = blockType.value;
                                // 타입 변경시 타이틀도 업데이트
                                const typeLabels = {
                                  'question': '문항',
                                  'passage': '지문',
                                  'concept': '개념',
                                  'explanation': '해설'
                                };
                                const count = selectedBlocks.filter((b, idx) => idx < selectedBlocks.indexOf(block) && b.type === blockType.value).length + 1;
                                block.title = `${typeLabels[blockType.value]} ${count}`;
                              }}
                            >
                              {blockType.label}
                            </button>
                          {/each}
                        </div>
                        
                        <div class="flex-1"></div>
                        
                        <!-- 삭제 버튼 -->
                        <button 
                          class="btn btn-ghost btn-xs btn-circle text-error hover:bg-error hover:text-white"
                          on:click={() => removeBlock(block.id)}
                          title="블록 삭제"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                          </svg>
                        </button>
                      </div>
                      
                      <!-- 두 번째 줄: 문항 유형 선택(문항일 때만), 순서 변경 버튼 -->
                      <div class="flex items-center gap-2 pl-6">
                        {#if block.type === 'question'}
                          <select 
                            class="select select-xs select-bordered"
                            bind:value={block.format}
                          >
                            <option value="">문항 유형 선택</option>
                            {#each questionFormats as format}
                              <option value={format.value}>{format.label}</option>
                            {/each}
                          </select>
                        {/if}
                        
                        <div class="flex-1"></div>
                        
                        <!-- 드래그 핸들 -->
                        <div class="rect-drag-icon cursor-move text-gray-400 hover:text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 15a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2zm0-4a1 1 0 1 1 0-2h14a1 1 0 1 1 0 2z"></path>
                          </svg>
                        </div>
                      </div>
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
              
              <!-- 하단 액션 버튼들 -->
              <div class="mt-4 pt-4 border-t border-gray-200">
                <!-- 선택된 블록 액션 -->
                {#if selectedBlocks.some(block => block.selected)}
                  <div class="space-y-3 mb-3 bg-base-200 rounded-lg p-3">
                    <!-- 선택된 개수 표시 -->
                    <div class="text-sm font-bold text-primary">
                      {selectedBlocks.filter(block => block.selected).length}개 선택됨
                    </div>
                    
                    <!-- 블록 타입 변경 -->
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">블록 타입 :</span>
                      <div class="flex gap-1">
                        {#each blockTypes as blockType}
                          <button 
                            class="btn btn-xs {selectedBlocks.filter(b => b.selected).every(b => b.type === blockType.value) ? `btn-${blockType.color}` : 'btn-ghost'}"
                            on:click={() => {
                              selectedBlocks.forEach(block => {
                                if (block.selected) {
                                  block.type = blockType.value;
                                  // 타입 변경시 타이틀도 업데이트
                                  const typeLabels = {
                                    'question': '문항',
                                    'passage': '지문',
                                    'concept': '개념',
                                    'explanation': '해설'
                                  };
                                  const count = selectedBlocks.filter((b, idx) => idx < selectedBlocks.indexOf(block) && b.type === blockType.value).length + 1;
                                  block.title = `${typeLabels[blockType.value]} ${count}`;
                                }
                              });
                              selectedBlocks = [...selectedBlocks];
                            }}
                          >
                            {blockType.label}
                          </button>
                        {/each}
                      </div>
                    </div>
                    
                    <!-- 삭제 버튼 -->
                    <button 
                      class="btn btn-error btn-sm btn-block"
                      on:click={() => {
                        if (confirm(`선택한 ${selectedBlocks.filter(block => block.selected).length}개 블록을 삭제하시겠습니까?`)) {
                          selectedBlocks = selectedBlocks.filter(block => !block.selected);
                        }
                      }}
                    >
                      선택한 {selectedBlocks.filter(block => block.selected).length}개 블록 삭제
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
      <!-- 3단계: 추가 정보 입력 -->
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
            <div class="space-y-3">
              {#if selectedCells.size > 0}
                <div class="text-sm font-bold text-primary">
                  {new Set(Array.from(selectedCells).map(cell => cell.split(',')[0])).size}개 블록 선택됨
                </div>
              {/if}
              
              <div class="flex flex-wrap gap-3">
                <!-- 타입 일괄 입력 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">블록타입 :</span>
                  <select class="select select-bordered select-sm w-24" bind:value={bulkBlockType}>
                    <option value="">선택</option>
                    {#each blockTypes as blockType}
                      <option value={blockType.value}>{blockType.label}</option>
                    {/each}
                  </select>
                  <button 
                    class="btn btn-primary btn-sm"
                    on:click={() => {
                      if (selectedCells.size > 0) {
                        applyValueToSelectedCells('type', bulkBlockType);
                      } else {
                        applyBulkValue('type', bulkBlockType);
                      }
                    }}
                    disabled={!bulkBlockType}
                  >
                    변경
                  </button>
                </div>
                
                <!-- 문제 유형 일괄 입력 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">문항유형 :</span>
                  <select class="select select-bordered select-sm w-24" bind:value={bulkQuestionType}>
                    <option value="">선택</option>
                    {#each questionFormats as format}
                      <option value={format.value}>{format.label}</option>
                    {/each}
                  </select>
                  <button 
                    class="btn btn-primary btn-sm"
                    on:click={() => {
                      if (selectedCells.size > 0) {
                        applyValueToSelectedCells('format', bulkQuestionType);
                      } else {
                        applyBulkValue('format', bulkQuestionType);
                      }
                    }}
                    disabled={!bulkQuestionType}
                  >
                    변경
                  </button>
                </div>
                
                <!-- 배점 일괄 입력 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">배점 :</span>
                  <input 
                    type="number" 
                    class="input input-bordered input-sm w-20" 
                    placeholder="3"
                    bind:value={bulkScore}
                    min="1"
                  />
                  <button 
                    class="btn btn-primary btn-sm"
                    on:click={() => {
                      if (selectedCells.size > 0) {
                        applyValueToSelectedCells('score', bulkScore);
                      } else {
                        applyBulkValue('score', bulkScore);
                      }
                    }}
                    disabled={!bulkScore}
                  >
                    변경
                  </button>
                </div>
                
                <!-- 난이도 일괄 입력 -->
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium whitespace-nowrap">난이도 :</span>
                  <select class="select select-bordered select-sm w-32" bind:value={bulkDifficulty}>
                    <option value="">선택</option>
                    <option value="very_easy">매우 쉬움</option>
                    <option value="easy">쉬움</option>
                    <option value="medium">보통</option>
                    <option value="hard">어려움</option>
                    <option value="very_hard">매우 어려움</option>
                  </select>
                  <button 
                    class="btn btn-primary btn-sm"
                    on:click={() => {
                      if (selectedCells.size > 0) {
                        applyValueToSelectedCells('difficulty', bulkDifficulty);
                      } else {
                        applyBulkValue('difficulty', bulkDifficulty);
                      }
                    }}
                    disabled={!bulkDifficulty}
                  >
                    변경
                  </button>
                </div>
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
                      <th class="p-3 text-left border-b" style="width: 50px;">
                        <input 
                          type="checkbox"
                          class="checkbox checkbox-sm"
                          checked={selectedBlocks.length > 0 && selectedCells.size >= selectedBlocks.length * 5}
                          on:change={(e) => {
                            if (e.target.checked) {
                              // 전체 선택 (정답과 연결 제외)
                              selectedCells.clear();
                              selectedBlocks.forEach((block, row) => {
                                selectedCells.add(`${row},-1`); // 타입
                                selectedCells.add(`${row},0`);  // 문항유형
                                selectedCells.add(`${row},2`);  // 배점
                                selectedCells.add(`${row},3`);  // 난이도
                                selectedCells.add(`${row},5`);  // 커스텀 태그
                              });
                            } else {
                              // 전체 해제
                              selectedCells.clear();
                            }
                            selectedCells = new Set(selectedCells);
                          }}
                        />
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
                      <tr class="hover:bg-base-100">
                        <!-- 번호 -->
                        <td class="p-3 border-b bg-base-100">
                          <div class="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              class="checkbox checkbox-sm"
                              checked={selectedCells.has(`${index},-1`) || selectedCells.has(`${index},0`) || selectedCells.has(`${index},2`) || selectedCells.has(`${index},3`) || selectedCells.has(`${index},5`)}
                              on:change={(e) => {
                                if (e.target.checked) {
                                  // 이 행의 편집 가능한 셀들 선택
                                  selectedCells.add(`${index},-1`); // 타입
                                  selectedCells.add(`${index},0`);  // 문항유형
                                  selectedCells.add(`${index},2`);  // 배점
                                  selectedCells.add(`${index},3`);  // 난이도
                                  selectedCells.add(`${index},5`);  // 커스텀 태그
                                } else {
                                  // 이 행의 모든 셀 선택 해제
                                  selectedCells.delete(`${index},-1`);
                                  selectedCells.delete(`${index},0`);
                                  selectedCells.delete(`${index},1`);
                                  selectedCells.delete(`${index},2`);
                                  selectedCells.delete(`${index},3`);
                                  selectedCells.delete(`${index},4`);
                                  selectedCells.delete(`${index},5`);
                                }
                                selectedCells = new Set(selectedCells);
                              }}
                            />
                            <span class="font-medium text-center text-sm">{index + 1}</span>
                          </div>
                        </td>
                        
                        <!-- 블록 타입 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, -1) ? 'bg-primary/20' : ''} {isCurrentCell(index, -1) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, -1)}
                        >
                          <select 
                            class="select select-bordered select-sm w-full bg-transparent"
                            bind:value={block.type}
                            data-cell="{index}--1"
                            tabindex="-1"
                            on:focus={(e) => {
                              currentCell = { row: index, col: -1 };
                              selectedCells.clear();
                              selectedCells.add(`${index},-1`);
                              selectedCells = new Set(selectedCells);
                            }}
                            on:keydown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!e.target.classList.contains('dropdown-open')) {
                                  // 드롭다운 열기 - 마우스 클릭과 동일하게
                                  e.target.classList.add('dropdown-open');
                                  const event = new MouseEvent('mousedown', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                  });
                                  e.target.dispatchEvent(event);
                                } else {
                                  // 다음 셀로 이동
                                  e.target.classList.remove('dropdown-open');
                                  moveToNextCell(index, -1);
                                }
                              }
                            }}
                          >
                            <option value="question">문항</option>
                            <option value="passage">지문</option>
                            <option value="concept">개념</option>
                            <option value="explanation">해설</option>
                          </select>
                        </td>
                        
                        <!-- 문항 유형 (문항일 때만) -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 0) ? 'bg-primary/20' : ''} {isCurrentCell(index, 0) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 0)}
                        >
                          <select 
                            class="select select-bordered select-sm w-full bg-transparent"
                            bind:value={block.format}
                            data-cell="{index}-0"
                            tabindex="-1"
                            disabled={block.type !== 'question'}
                            on:keydown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!e.target.classList.contains('dropdown-open')) {
                                  // 드롭다운 열기 - 마우스 클릭과 동일하게
                                  e.target.classList.add('dropdown-open');
                                  const event = new MouseEvent('mousedown', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                  });
                                  e.target.dispatchEvent(event);
                                } else {
                                  // 다음 셀로 이동
                                  e.target.classList.remove('dropdown-open');
                                  moveToNextCell(index, 0);
                                }
                              }
                            }}
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
                            disabled={block.type !== 'question'}
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
                            disabled={block.type !== 'question'}
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
                            disabled={block.type !== 'question'}
                            on:keydown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (!e.target.classList.contains('dropdown-open')) {
                                  // 드롭다운 열기 - 마우스 클릭과 동일하게
                                  e.target.classList.add('dropdown-open');
                                  const event = new MouseEvent('mousedown', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                  });
                                  e.target.dispatchEvent(event);
                                } else {
                                  // 다음 셀로 이동
                                  e.target.classList.remove('dropdown-open');
                                  moveToNextCell(index, 3);
                                }
                              }
                            }}
                          >
                            <option value="">선택</option>
                            <option value="very_easy">매우 쉬움</option>
                            <option value="easy">쉬움</option>
                            <option value="medium">보통</option>
                            <option value="hard">어려움</option>
                            <option value="very_hard">매우 어려움</option>
                          </select>
                        </td>
                        
                        <!-- 연결 (지문/해설일 때) -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 4) ? 'bg-primary/20' : ''} {isCurrentCell(index, 4) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 4)}
                        >
                          {#if block.type === 'passage' || block.type === 'explanation'}
                            <input 
                              type="text" 
                              class="input input-bordered input-sm w-full bg-transparent"
                              bind:value={block.linkedQuestionsText}
                              placeholder="문항 번호 (예: 1,2,3)"
                              data-cell="{index}-4"
                              tabindex="-1"
                              on:blur={() => {
                                // 입력된 문항 번호를 배열로 변환
                                if (block.linkedQuestionsText) {
                                  block.linkedQuestions = block.linkedQuestionsText
                                    .split(',')
                                    .map(n => parseInt(n.trim()))
                                    .filter(n => !isNaN(n) && n > 0 && n <= selectedBlocks.length);
                                }
                              }}
                            />
                          {:else}
                            <span class="text-xs text-base-content/50">-</span>
                          {/if}
                        </td>
                        
                        <!-- 커스텀 태그 -->
                        <td 
                          class="p-3 border-b {isCellSelected(index, 5) ? 'bg-primary/20' : ''} {isCurrentCell(index, 5) ? 'ring-2 ring-primary' : ''}"
                          on:click={(e) => handleCellClick(e, index, 5)}
                        >
                          <div class="flex flex-wrap gap-1">
                            {#each block.customTags as tag}
                              <div class="badge badge-sm badge-outline gap-1">
                                {tag}
                                <button 
                                  class="text-xs hover:text-error"
                                  on:click|stopPropagation={() => {
                                    block.customTags = block.customTags.filter(t => t !== tag);
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            {/each}
                            <input 
                              type="text" 
                              class="input input-xs input-ghost w-20"
                              placeholder="+태그"
                              on:keydown={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  e.preventDefault();
                                  block.customTags = [...block.customTags, e.target.value.trim()];
                                  e.target.value = '';
                                }
                              }}
                              data-cell="{index}-5"
                              tabindex="-1"
                            />
                          </div>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
            
            <!-- 표 하단 요약 정보 -->
            <div class="p-4 border-t bg-base-200">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-4">
                  <span>총 {selectedBlocks.length}개 블록</span>
                  <span>문항: {selectedBlocks.filter(b => b.type === 'question').length}개</span>
                  <span>필수 입력 완료: {selectedBlocks.filter(b => b.type === 'question' && b.format && b.answer && b.score).length}/{selectedBlocks.filter(b => b.type === 'question').length}</span>
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

<style>
  .rect-block-item {
    @apply border border-base-300 rounded-lg p-3 hover:shadow-md transition-all duration-200 bg-base-100;
  }
  
  .rect-checkbox {
    @apply flex items-center;
  }
  
  .rect-drag-icon {
    @apply flex items-center justify-center;
  }
  
  .rc-segmented {
    @apply flex items-center;
  }
  
  .editable-table {
    @apply text-sm;
  }
  
  .editable-table td {
    @apply cursor-cell;
  }
  
  .editable-table-container:focus {
    @apply outline-none;
  }
  
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>