<script>
  import { createEventDispatcher } from 'svelte';
  
  export let autoExtractMode = false;
  
  const dispatch = createEventDispatcher();
  
  function toggleAutoExtract() {
    if (autoExtractMode) {
      dispatch('manualMode');
    } else {
      dispatch('autoExtract');
    }
  }
</script>

<div class="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
  <div class="flex items-center space-x-4">
    <h3 class="font-medium text-gray-900">문항 추출 도구</h3>
    
    <div class="flex items-center space-x-2">
      <button
        on:click={toggleAutoExtract}
        class="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors
               {autoExtractMode ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
        <span>{autoExtractMode ? '자동 추출 ON' : '자동 문항 추출'}</span>
      </button>
      
      {#if !autoExtractMode}
        <div class="text-sm text-gray-600 flex items-center space-x-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>드래그하여 문항을 선택하세요</span>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="flex items-center space-x-2">
    {#if autoExtractMode}
      <div class="text-sm text-green-600 flex items-center space-x-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>자동으로 문항을 인식하고 있습니다</span>
      </div>
    {/if}
    
    <button class="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded" title="도움말">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </button>
  </div>
</div>