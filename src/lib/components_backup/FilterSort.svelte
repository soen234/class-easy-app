<script>
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  let searchTerm = '';
  let sortBy = 'createdAt';
  let sortOrder = 'desc';
  let selectedType = 'all';
  
  const sortOptions = [
    { value: 'createdAt', label: '생성일' },
    { value: 'title', label: '제목' },
    { value: 'pages', label: '페이지 수' }
  ];
  
  const typeOptions = [
    { value: 'all', label: '전체' },
    { value: 'pdf', label: 'PDF' },
    { value: 'doc', label: 'DOC' },
    { value: 'ppt', label: 'PPT' }
  ];
  
  function handleFilterChange() {
    dispatch('filter', {
      searchTerm,
      sortBy,
      sortOrder,
      selectedType
    });
  }
  
  $: handleFilterChange();
</script>

<div class="bg-white rounded-lg shadow p-4">
  <div class="flex flex-col md:flex-row gap-4">
    <!-- 검색 -->
    <div class="flex-1">
      <div class="relative">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="자료 검색..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>
    </div>
    
    <!-- 파일 종류 필터 -->
    <div class="min-w-[120px]">
      <select 
        bind:value={selectedType}
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {#each typeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
    
    <!-- 정렬 -->
    <div class="flex space-x-2">
      <select 
        bind:value={sortBy}
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {#each sortOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
      
      <button
        on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
        class="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
      >
        {#if sortOrder === 'asc'}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path>
          </svg>
        {/if}
      </button>
    </div>
  </div>
</div>