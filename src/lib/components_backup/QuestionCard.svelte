<script>
  import { createEventDispatcher } from 'svelte';
  
  export let question;
  export let selected = false;
  
  const dispatch = createEventDispatcher();
  
  function handleSelect() {
    dispatch('select');
  }
  
  function handleAction(action) {
    dispatch('action', action);
  }
  
  function getTypeColor(type) {
    switch(type) {
      case 'problem': return 'bg-blue-100 text-blue-800';
      case 'explanation': return 'bg-green-100 text-green-800';
      case 'passage': return 'bg-yellow-100 text-yellow-800';
      case 'concept': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  function getTypeLabel(type) {
    switch(type) {
      case 'problem': return '문제';
      case 'explanation': return '해설';
      case 'passage': return '지문';
      case 'concept': return '개념';
      default: return type;
    }
  }
</script>

<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 {selected ? 'ring-2 ring-blue-500' : ''}">
  <!-- 헤더 -->
  <div class="p-4 border-b border-gray-200">
    <div class="flex items-start justify-between">
      <div class="flex items-center space-x-3">
        <input 
          type="checkbox" 
          class="rounded" 
          {selected}
          on:change={handleSelect}
        />
        <div class="flex-1">
          <h3 class="font-semibold text-gray-900 mb-1">{question.title}</h3>
          <div class="flex items-center space-x-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getTypeColor(question.type)}">
              {getTypeLabel(question.type)}
            </span>
            {#if question.questionType}
              <span class="text-xs text-gray-500">
                {question.questionType === 'multipleChoice' ? '객관식' : 
                 question.questionType === 'subjective' ? '주관식' : 
                 question.questionType === 'essay' ? '서술형' : 
                 question.questionType === 'ox' ? 'OX' : question.questionType}
              </span>
            {/if}
          </div>
        </div>
      </div>
      <button 
        class="text-gray-400 hover:text-gray-600"
        on:click={() => handleAction('menu')}
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 내용 -->
  <div class="p-4">
    <div class="text-sm text-gray-700 mb-3 line-clamp-3">
      {question.content}
    </div>
    
    {#if question.answer}
      <div class="text-sm mb-3">
        <span class="font-medium text-gray-700">정답:</span>
        <span class="text-blue-600 font-medium">{question.answer}</span>
      </div>
    {/if}
    
    <!-- 태그 -->
    {#if question.tags && question.tags.length > 0}
      <div class="flex flex-wrap gap-1 mb-3">
        {#each question.tags as tag}
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
            {tag}
          </span>
        {/each}
      </div>
    {/if}
    
    <!-- 연결된 항목 -->
    {#if question.relatedItems && question.relatedItems.length > 0}
      <div class="text-xs text-gray-500 mb-3">
        연결된 항목: {question.relatedItems.length}개
      </div>
    {/if}
    
    <!-- 생성일 -->
    <div class="text-xs text-gray-500 mb-4">
      {question.createdAt}
    </div>
    
    <!-- 액션 버튼들 -->
    <div class="flex space-x-2">
      <button 
        on:click={() => handleAction('edit')}
        class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        편집
      </button>
      <button 
        on:click={() => handleAction('connect')}
        class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
      >
        연결
      </button>
      <button 
        on:click={() => handleAction('delete')}
        class="px-3 py-2 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
      >
        삭제
      </button>
    </div>
  </div>
</div>