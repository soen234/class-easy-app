<script>
  import { createEventDispatcher } from 'svelte';
  
  export let material;
  
  const dispatch = createEventDispatcher();
  
  function handleAction(action) {
    dispatch('action', action);
  }
</script>

<div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
  <!-- 썸네일 -->
  <div class="aspect-w-16 aspect-h-9 bg-gray-200 rounded-t-lg flex items-center justify-center">
    <div class="text-4xl">📄</div>
  </div>
  
  <!-- 내용 -->
  <div class="p-4">
    <h3 class="font-semibold text-gray-900 mb-2 truncate">{material.title}</h3>
    <div class="text-sm text-gray-500 mb-4">
      <div>{material.type.toUpperCase()} • {material.pages}페이지</div>
      <div>{material.createdAt}</div>
    </div>
    
    <!-- 액션 버튼들 -->
    <div class="flex flex-col space-y-2">
      <button 
        on:click={() => handleAction('extract')}
        class="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        문항 추출
      </button>
      <div class="flex space-x-2">
        <button 
          on:click={() => handleAction('download')}
          class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
        >
          다운로드
        </button>
        <button 
          on:click={() => handleAction('edit')}
          class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors"
        >
          자료 편집
        </button>
      </div>
    </div>
  </div>
</div>