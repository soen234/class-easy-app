<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let canUndo = false;
  export let canRedo = false;
  export let zoom = 100;
  
  function handleUndo() {
    dispatch('undo');
  }
  
  function handleRedo() {
    dispatch('redo');
  }
  
  function handleZoomChange(newZoom) {
    dispatch('zoom', newZoom);
  }
  
  function handleSave() {
    dispatch('save');
  }
</script>

<div class="bg-white border-b border-gray-200 px-4 py-2">
  <div class="flex items-center justify-between">
    <!-- 편집 도구 -->
    <div class="flex items-center space-x-2">
      <button 
        on:click={handleUndo}
        disabled={!canUndo}
        class="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
        title="실행 취소"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
        </svg>
      </button>
      
      <button 
        on:click={handleRedo}
        disabled={!canRedo}
        class="p-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed"
        title="다시 실행"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"></path>
        </svg>
      </button>
      
      <div class="h-6 w-px bg-gray-300"></div>
      
      <!-- 줌 컨트롤 -->
      <div class="flex items-center space-x-2">
        <button 
          on:click={() => handleZoomChange(Math.max(50, zoom - 10))}
          class="p-1 text-gray-600 hover:text-gray-800"
          title="축소"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
          </svg>
        </button>
        
        <span class="text-sm text-gray-600 min-w-[50px] text-center">{zoom}%</span>
        
        <button 
          on:click={() => handleZoomChange(Math.min(200, zoom + 10))}
          class="p-1 text-gray-600 hover:text-gray-800"
          title="확대"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 저장 버튼 -->
    <button 
      on:click={handleSave}
      class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
    >
      저장
    </button>
  </div>
</div>