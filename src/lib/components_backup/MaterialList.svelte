<script>
  import MaterialCard from './MaterialCard.svelte';
  import FilterSort from './FilterSort.svelte';
  import { writable } from 'svelte/store';
  
  export let type = 'original'; // 'original' or 'lesson'
  
  const materials = writable([
    {
      id: 1,
      title: '블랙라벨 수학(하)',
      type: 'pdf',
      createdAt: '2024-01-15',
      pages: 120,
      thumbnail: '/placeholder-thumbnail.jpg'
    },
    {
      id: 2,
      title: '고등 수학 워크북',
      type: 'pdf',
      createdAt: '2024-01-10',
      pages: 80,
      thumbnail: '/placeholder-thumbnail.jpg'
    }
  ]);
  
  let filteredMaterials = [];
  let viewMode = 'card'; // 'card' or 'list'
  
  materials.subscribe(value => {
    filteredMaterials = value;
  });
  
  function handleUpload() {
    // 자료 올리기 기능
    console.log('자료 올리기');
  }
  
  function handleCreate() {
    // 자료 만들기 기능
    console.log('자료 만들기');
  }
  
  function handleMaterialAction(material, action) {
    console.log(`${action} for material:`, material);
    // 각 액션별 처리 로직
  }
</script>

<div class="space-y-4">
  <!-- 상단 액션 버튼 -->
  <div class="flex justify-between items-center">
    <div class="flex space-x-3">
      <button 
        on:click={handleUpload}
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>자료 올리기</span>
      </button>
      
      <button 
        on:click={handleCreate}
        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>자료 만들기</span>
      </button>
    </div>
    
    <!-- 뷰 모드 토글 -->
    <div class="flex items-center space-x-2">
      <button 
        on:click={() => viewMode = 'card'}
        class="p-2 rounded {viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
      </button>
      <button 
        on:click={() => viewMode = 'list'}
        class="p-2 rounded {viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 필터 및 정렬 -->
  <FilterSort />
  
  <!-- 자료 목록 -->
  <div class="mt-6">
    {#if viewMode === 'card'}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each filteredMaterials as material}
          <MaterialCard {material} on:action={(e) => handleMaterialAction(material, e.detail)} />
        {/each}
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
            <div class="col-span-6">제목</div>
            <div class="col-span-2">종류</div>
            <div class="col-span-2">생성일</div>
            <div class="col-span-2">액션</div>
          </div>
        </div>
        <div class="divide-y divide-gray-200">
          {#each filteredMaterials as material}
            <div class="px-6 py-4 hover:bg-gray-50">
              <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-6">
                  <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      📄
                    </div>
                    <div>
                      <div class="font-medium text-gray-900">{material.title}</div>
                      <div class="text-sm text-gray-500">{material.pages}페이지</div>
                    </div>
                  </div>
                </div>
                <div class="col-span-2 text-sm text-gray-900">{material.type.toUpperCase()}</div>
                <div class="col-span-2 text-sm text-gray-900">{material.createdAt}</div>
                <div class="col-span-2">
                  <div class="flex space-x-2">
                    <button 
                      on:click={() => handleMaterialAction(material, 'extract')}
                      class="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      문항추출
                    </button>
                    <button 
                      on:click={() => handleMaterialAction(material, 'download')}
                      class="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      다운로드
                    </button>
                    <button 
                      on:click={() => handleMaterialAction(material, 'edit')}
                      class="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      편집
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>