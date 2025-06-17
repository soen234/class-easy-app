<script>
  import { createEventDispatcher } from 'svelte';
  
  export let material;
  export let autoExtractMode = false;
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragEnd = { x: 0, y: 0 };
  let currentPage = 1;
  let totalPages = material?.pages || 10;
  
  function handleMouseDown(event) {
    if (autoExtractMode) return;
    
    isDragging = true;
    const rect = event.currentTarget.getBoundingClientRect();
    dragStart = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  function handleMouseMove(event) {
    if (!isDragging || autoExtractMode) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    dragEnd = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  
  function handleMouseUp() {
    if (!isDragging || autoExtractMode) return;
    
    isDragging = false;
    
    // 드래그 영역이 충분히 클 때만 블록 생성
    const width = Math.abs(dragEnd.x - dragStart.x);
    const height = Math.abs(dragEnd.y - dragStart.y);
    
    if (width > 20 && height > 20) {
      const blockData = {
        id: `block_${Date.now()}`,
        type: 'problem',
        content: '추출된 텍스트 내용',
        position: {
          x: Math.min(dragStart.x, dragEnd.x),
          y: Math.min(dragStart.y, dragEnd.y),
          width,
          height
        },
        page: currentPage
      };
      
      dispatch('extract', blockData);
    }
    
    // 드래그 상태 초기화
    dragStart = { x: 0, y: 0 };
    dragEnd = { x: 0, y: 0 };
  }
  
  function nextPage() {
    if (currentPage < totalPages) {
      currentPage++;
    }
  }
  
  function prevPage() {
    if (currentPage > 1) {
      currentPage--;
    }
  }
  
  function goToPage(page) {
    currentPage = page;
  }
</script>

<div class="h-full flex flex-col">
  <!-- 페이지 네비게이션 -->
  <div class="flex items-center justify-between p-4 border-b border-gray-200">
    <div class="flex items-center space-x-2">
      <button 
        on:click={prevPage}
        disabled={currentPage === 1}
        class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      
      <span class="text-sm text-gray-600">
        {currentPage} / {totalPages}
      </span>
      
      <button 
        on:click={nextPage}
        disabled={currentPage === totalPages}
        class="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
    
    <div class="flex items-center space-x-2">
      <button class="p-2 rounded hover:bg-gray-100" title="확대">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"></path>
        </svg>
      </button>
      <button class="p-2 rounded hover:bg-gray-100" title="축소">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 문서 미리보기 -->
  <div class="flex-1 overflow-auto p-4">
    <div 
      class="relative bg-white border border-gray-300 mx-auto shadow-lg"
      style="width: 595px; height: 842px; cursor: {autoExtractMode ? 'default' : 'crosshair'}"
      on:mousedown={handleMouseDown}
      on:mousemove={handleMouseMove}
      on:mouseup={handleMouseUp}
      on:mouseleave={handleMouseUp}
    >
      <!-- 문서 내용 (실제로는 PDF 렌더링이나 이미지) -->
      <div class="p-8 text-gray-800">
        <h2 class="text-xl font-bold mb-4">수학 문제 {currentPage}</h2>
        
        <div class="space-y-6">
          <div class="border border-gray-200 p-4 rounded">
            <p class="font-semibold mb-2">1. 다음 함수의 정의역을 구하시오.</p>
            <p class="mb-2">f(x) = √(x - 2) + 1/(x + 1)</p>
            <div class="flex space-x-4 text-sm">
              <span>① x ≥ 2, x ≠ -1</span>
              <span>② x > 2, x ≠ -1</span>
              <span>③ x ≥ 2</span>
              <span>④ x > 2</span>
            </div>
          </div>
          
          <div class="border border-gray-200 p-4 rounded">
            <p class="font-semibold mb-2">2. 다음 식을 간단히 하시오.</p>
            <p class="mb-2">(x + 2)² - (x - 1)(x + 3)</p>
            <div class="flex space-x-4 text-sm">
              <span>① x + 7</span>
              <span>② 2x + 7</span>
              <span>③ x + 1</span>
              <span>④ 2x + 1</span>
            </div>
          </div>
          
          <div class="border border-gray-200 p-4 rounded">
            <p class="font-semibold mb-2">3. 다음 부등식을 만족하는 x의 범위를 구하시오.</p>
            <p class="mb-2">2x - 1 > x + 3</p>
          </div>
        </div>
      </div>
      
      <!-- 드래그 선택 영역 -->
      {#if isDragging}
        <div 
          class="absolute border-2 border-blue-500 bg-blue-100 bg-opacity-30"
          style="left: {Math.min(dragStart.x, dragEnd.x)}px; 
                 top: {Math.min(dragStart.y, dragEnd.y)}px; 
                 width: {Math.abs(dragEnd.x - dragStart.x)}px; 
                 height: {Math.abs(dragEnd.y - dragStart.y)}px;"
        ></div>
      {/if}
      
      <!-- 자동 추출 모드에서 인식된 영역들 -->
      {#if autoExtractMode}
        <div class="absolute inset-0">
          <!-- 예시 인식된 영역들 -->
          <div class="absolute border-2 border-green-500 bg-green-100 bg-opacity-30" 
               style="left: 32px; top: 120px; width: 400px; height: 80px;"></div>
          <div class="absolute border-2 border-green-500 bg-green-100 bg-opacity-30" 
               style="left: 32px; top: 220px; width: 400px; height: 80px;"></div>
          <div class="absolute border-2 border-green-500 bg-green-100 bg-opacity-30" 
               style="left: 32px; top: 320px; width: 400px; height: 60px;"></div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- 하단 페이지 썸네일 -->
  <div class="border-t border-gray-200 p-4">
    <div class="flex space-x-2 overflow-x-auto">
      {#each Array(totalPages) as _, i}
        <button
          on:click={() => goToPage(i + 1)}
          class="flex-shrink-0 w-16 h-20 border border-gray-300 rounded bg-white hover:bg-gray-50 
                 {currentPage === i + 1 ? 'ring-2 ring-blue-500' : ''}"
        >
          <div class="text-xs text-center mt-1">Page {i + 1}</div>
        </button>
      {/each}
    </div>
  </div>
</div>