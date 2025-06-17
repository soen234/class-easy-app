<script>
  import { createEventDispatcher } from 'svelte';
  
  export let blocks = [];
  export let selectedBlocks = new Set();
  
  const dispatch = createEventDispatcher();
  
  function handleBlockSelect(blockId) {
    dispatch('select', blockId);
  }
  
  function handleBlockEdit(block) {
    dispatch('edit', block);
  }
  
  function handleBlockDelete(blockId) {
    blocks = blocks.filter(block => block.id !== blockId);
  }
  
  function handleBlockTypeChange(blockId, newType) {
    blocks = blocks.map(block => 
      block.id === blockId ? { ...block, type: newType } : block
    );
  }
  
  function handleMergeBlocks() {
    const selectedBlockIds = Array.from(selectedBlocks);
    if (selectedBlockIds.length < 2) return;
    
    // 병합 로직 구현
    console.log('병합할 블록들:', selectedBlockIds);
  }
  
  function handleSplitBlock(blockId) {
    // 분리 로직 구현
    console.log('분리할 블록:', blockId);
  }
  
  function handleExtract() {
    if (blocks.length === 0) {
      alert('추출할 블록이 없습니다.');
      return;
    }
    dispatch('extract');
  }
  
  function getBlockTypeLabel(type) {
    switch(type) {
      case 'problem': return '문제';
      case 'explanation': return '해설';
      case 'passage': return '지문';
      case 'concept': return '개념';
      default: return type;
    }
  }
  
  function getBlockTypeColor(type) {
    switch(type) {
      case 'problem': return 'bg-blue-100 text-blue-800';
      case 'explanation': return 'bg-green-100 text-green-800';
      case 'passage': return 'bg-yellow-100 text-yellow-800';
      case 'concept': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="bg-white rounded-lg shadow h-full flex flex-col">
  <!-- 헤더 -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-medium text-gray-900">추출된 블록</h3>
      <span class="text-sm text-gray-500">{blocks.length}개</span>
    </div>
    
    <!-- 일괄 작업 버튼들 -->
    {#if selectedBlocks.size > 0}
      <div class="flex space-x-2 mb-4">
        {#if selectedBlocks.size > 1}
          <button 
            on:click={handleMergeBlocks}
            class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            병합 ({selectedBlocks.size})
          </button>
        {/if}
        <button 
          class="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          삭제 ({selectedBlocks.size})
        </button>
      </div>
    {/if}
  </div>
  
  <!-- 블록 목록 -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3">
    {#each blocks as block, index}
      <div 
        class="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors
               {selectedBlocks.has(block.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''}"
      >
        <div class="flex items-start space-x-3">
          <input 
            type="checkbox" 
            class="mt-1 rounded"
            checked={selectedBlocks.has(block.id)}
            on:change={() => handleBlockSelect(block.id)}
          />
          
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-900">
                블록 {index + 1}
              </span>
              <button 
                on:click={() => handleBlockEdit(block)}
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
            
            <!-- 블록 타입 선택 -->
            <div class="mb-2">
              <select 
                class="text-xs px-2 py-1 border border-gray-300 rounded {getBlockTypeColor(block.type)}"
                value={block.type}
                on:change={(e) => handleBlockTypeChange(block.id, e.target.value)}
              >
                <option value="problem">문제</option>
                <option value="explanation">해설</option>
                <option value="passage">지문</option>
                <option value="concept">개념</option>
              </select>
            </div>
            
            <!-- 블록 내용 미리보기 -->
            <div class="text-xs text-gray-600 mb-2 line-clamp-2">
              {block.content}
            </div>
            
            <!-- 블록 정보 -->
            <div class="text-xs text-gray-500">
              페이지 {block.page} • 
              {Math.round(block.position.width)} × {Math.round(block.position.height)}px
            </div>
            
            <!-- 블록 액션 -->
            <div class="flex space-x-2 mt-2">
              <button 
                on:click={() => handleSplitBlock(block.id)}
                class="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded"
              >
                분리
              </button>
              <button 
                on:click={() => handleBlockDelete(block.id)}
                class="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      </div>
    {/each}
    
    {#if blocks.length === 0}
      <div class="text-center py-8 text-gray-500">
        <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <p class="text-sm">추출된 블록이 없습니다.</p>
        <p class="text-xs mt-1">문서에서 드래그하여 블록을 선택하거나<br>자동 추출을 사용하세요.</p>
      </div>
    {/if}
  </div>
  
  <!-- 하단 액션 버튼 -->
  <div class="p-4 border-t border-gray-200">
    <button 
      on:click={handleExtract}
      disabled={blocks.length === 0}
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      추출하기 ({blocks.length}개)
    </button>
  </div>
</div>