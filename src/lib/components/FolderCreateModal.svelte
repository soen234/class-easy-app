<script>
  import { createEventDispatcher } from 'svelte';
  
  export let isOpen = false;
  export let currentPath = '';
  export let parentId = null;
  export let folderType = 'materials';
  
  const dispatch = createEventDispatcher();
  
  let folderName = '';
  let loading = false;
  let error = '';
  
  // 색상 옵션
  const colorOptions = [
    { value: '#gray', label: '회색', class: 'bg-gray-500' },
    { value: '#blue', label: '파랑', class: 'bg-blue-500' },
    { value: '#green', label: '초록', class: 'bg-green-500' },
    { value: '#yellow', label: '노랑', class: 'bg-yellow-500' },
    { value: '#red', label: '빨강', class: 'bg-red-500' },
    { value: '#purple', label: '보라', class: 'bg-purple-500' }
  ];
  
  let selectedColor = '#gray';
  
  // 폴더명 유효성 검사
  function validateFolderName(name) {
    if (!name || !name.trim()) {
      return '폴더 이름을 입력해주세요.';
    }
    
    if (name.length > 50) {
      return '폴더 이름은 50자 이하여야 합니다.';
    }
    
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return '폴더 이름에 특수문자(<>:"/\\|?*)를 사용할 수 없습니다.';
    }
    
    return null;
  }
  
  async function handleSubmit() {
    const validationError = validateFolderName(folderName);
    if (validationError) {
      error = validationError;
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
        },
        body: JSON.stringify({
          name: folderName.trim(),
          parent_id: parentId,
          folder_type: folderType,
          color: selectedColor
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || '폴더 생성에 실패했습니다.');
      }
      
      dispatch('create', result.data);
      handleClose();
      
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
  
  function handleClose() {
    if (!loading) {
      dispatch('close');
      resetForm();
    }
  }
  
  function resetForm() {
    folderName = '';
    selectedColor = '#gray';
    error = '';
  }
  
  // Enter 키로 폴더 생성
  function handleKeydown(e) {
    if (e.key === 'Enter' && !loading) {
      handleSubmit();
    }
    if (e.key === 'Escape' && !loading) {
      handleClose();
    }
  }
  
  // 모달이 열릴 때 input에 포커스
  $: if (isOpen) {
    setTimeout(() => {
      const input = document.getElementById('folder-name-input');
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }
</script>

{#if isOpen}
  <!-- 모달 백드롭 -->
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    on:click={handleClose}
    on:keydown={handleKeydown}
  >
    <!-- 모달 컨텐츠 -->
    <div 
      class="bg-base-100 rounded-lg shadow-xl w-full max-w-md"
      on:click|stopPropagation
    >
      <!-- 헤더 -->
      <div class="flex items-center justify-between p-6 pb-4">
        <h3 class="text-lg font-bold">새 폴더 만들기</h3>
        <button 
          class="btn btn-ghost btn-sm btn-circle"
          on:click={handleClose}
          disabled={loading}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 바디 -->
      <div class="px-6 pb-6 space-y-4">
        <!-- 폴더 이름 입력 -->
        <div class="form-control">
          <label class="label" for="folder-name-input">
            <span class="label-text">폴더 이름</span>
          </label>
          <input 
            id="folder-name-input"
            type="text" 
            placeholder="새 폴더" 
            class="input input-bordered w-full"
            class:input-error={error}
            bind:value={folderName}
            on:keydown={handleKeydown}
            disabled={loading}
          />
          {#if error}
            <label class="label">
              <span class="label-text-alt text-error">{error}</span>
            </label>
          {/if}
        </div>
        
        <!-- 색상 선택 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">폴더 색상</span>
          </label>
          <div class="flex gap-2">
            {#each colorOptions as color}
              <label class="cursor-pointer">
                <input 
                  type="radio" 
                  name="folder-color" 
                  value={color.value}
                  bind:group={selectedColor}
                  class="sr-only"
                />
                <div 
                  class="w-8 h-8 rounded-full {color.class} ring-2 transition-all
                         {selectedColor === color.value ? 'ring-primary ring-offset-2' : 'ring-transparent'}"
                  title={color.label}
                ></div>
              </label>
            {/each}
          </div>
        </div>
        
        <!-- 위치 표시 -->
        <div class="text-sm text-base-content/70">
          <span>위치: </span>
          <span class="font-medium">
            {#if currentPath}
              📁 {currentPath}
            {:else}
              📁 내 자료
            {/if}
          </span>
        </div>
      </div>
      
      <!-- 푸터 -->
      <div class="flex justify-end gap-2 px-6 pb-6">
        <button 
          class="btn btn-ghost"
          on:click={handleClose}
          disabled={loading}
        >
          취소
        </button>
        <button 
          class="btn btn-primary"
          on:click={handleSubmit}
          disabled={loading || !folderName.trim()}
        >
          {#if loading}
            <span class="loading loading-spinner loading-sm"></span>
          {/if}
          폴더 만들기
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 모달 애니메이션 */
  .fixed {
    animation: fadeIn 0.2s ease-out;
  }
  
  .bg-base-100 {
    animation: slideUp 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>