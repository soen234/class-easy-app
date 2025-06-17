<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let questions = [];
  export let selectedQuestions = [];
  export let isOpen = false;
  
  let searchTerm = '';
  let filteredQuestions = [];
  
  $: filteredQuestions = questions.filter(q => 
    q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.content.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  function handleSelect(question) {
    const isSelected = selectedQuestions.some(q => q.id === question.id);
    if (isSelected) {
      selectedQuestions = selectedQuestions.filter(q => q.id !== question.id);
    } else {
      selectedQuestions = [...selectedQuestions, question];
    }
    dispatch('selectionChange', selectedQuestions);
  }
  
  function handleClose() {
    dispatch('close');
  }
  
  function handleConfirm() {
    dispatch('confirm', selectedQuestions);
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
      <!-- 헤더 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-xl font-semibold text-gray-900">문항 선택</h2>
        <button 
          on:click={handleClose}
          class="text-gray-400 hover:text-gray-600"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 검색 -->
      <div class="p-6 border-b border-gray-200">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="문항 검색..."
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <!-- 문항 목록 -->
      <div class="overflow-y-auto" style="max-height: 400px;">
        <div class="p-6">
          {#if filteredQuestions.length === 0}
            <div class="text-center text-gray-500 py-8">
              검색 결과가 없습니다.
            </div>
          {:else}
            <div class="space-y-3">
              {#each filteredQuestions as question}
                {@const isSelected = selectedQuestions.some(q => q.id === question.id)}
                <div 
                  class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer
                         {isSelected ? 'border-blue-500 bg-blue-50' : ''}"
                  on:click={() => handleSelect(question)}
                >
                  <div class="flex items-start space-x-3">
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      class="mt-1 rounded"
                      on:change={() => handleSelect(question)}
                    />
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 mb-1">{question.title}</h3>
                      <p class="text-sm text-gray-600 line-clamp-2">{question.content}</p>
                      <div class="flex items-center space-x-2 mt-2">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                          {question.type === 'problem' ? '문제' : 
                           question.type === 'explanation' ? '해설' : 
                           question.type === 'passage' ? '지문' : '개념'}
                        </span>
                        {#if question.answer}
                          <span class="text-xs text-blue-600">정답: {question.answer}</span>
                        {/if}
                      </div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- 하단 버튼 -->
      <div class="flex items-center justify-between p-6 border-t border-gray-200">
        <div class="text-sm text-gray-600">
          {selectedQuestions.length}개 선택됨
        </div>
        <div class="flex space-x-3">
          <button 
            on:click={handleClose}
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button 
            on:click={handleConfirm}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}