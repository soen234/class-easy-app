<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials, loading, fetchMaterials, deleteMaterial, formatFileSize, getFileTypeIcon } from '$lib/stores/materials.js';
  
  export let type = 'original';
  
  let filteredMaterials = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let viewType = 'grid'; // 'grid' or 'list'

  // 사용자가 변경되거나 타입이 변경될 때 데이터 재조회
  $: if ($user?.id && type) {
    loadMaterials();
  }

  // 검색 및 정렬 적용
  $: {
    let filtered = $materials.filter(material => {
      const matchesType = material.type === type;
      const matchesSearch = !searchTerm || 
        material.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });

    // 정렬 적용
    filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    filteredMaterials = filtered;
  }

  async function loadMaterials() {
    if ($user?.id) {
      await fetchMaterials($user.id, type);
    }
  }

  function handleUpload() {
    goto('/upload');
  }

  function handleCreate() {
    // TODO: 자료 만들기 페이지로 이동
    console.log('자료 만들기');
  }

  function handleExtract(material) {
    // TODO: 문항 추출 페이지로 이동
    console.log('문항 추출:', material);
  }

  function handleEdit(material) {
    // TODO: 자료 편집 페이지로 이동
    console.log('자료 편집:', material);
  }

  async function handleDelete(material) {
    if (confirm(`"${material.title}"을(를) 삭제하시겠습니까?`)) {
      const { error } = await deleteMaterial(material.id);
      if (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  onMount(() => {
    if ($user?.id) {
      loadMaterials();
    }
  });
</script>

<div class="space-y-4">
  <!-- 상단 검색 및 액션 -->
  <div class="flex flex-col lg:flex-row gap-4 justify-between">
    <!-- 검색 -->
    <div class="flex-1 max-w-md">
      <input
        type="text"
        placeholder="자료 검색..."
        class="input input-bordered w-full"
        bind:value={searchTerm}
      />
    </div>
    
    <!-- 정렬, 뷰 타입 및 액션 버튼 -->
    <div class="flex gap-3 items-center">
      <!-- 뷰 타입 토글 -->
      <div class="join">
        <button 
          class="btn btn-sm join-item {viewType === 'grid' ? 'btn-active' : ''}"
          on:click={() => viewType = 'grid'}
          title="카드 보기"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
        </button>
        <button 
          class="btn btn-sm join-item {viewType === 'list' ? 'btn-active' : ''}"
          on:click={() => viewType = 'list'}
          title="리스트 보기"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
        </button>
      </div>
      
      <!-- 정렬 옵션 -->
      <div class="flex items-center gap-2">
        <select class="select select-bordered select-sm" bind:value={sortBy}>
          <option value="created_at">생성일</option>
          <option value="title">제목</option>
          <option value="file_size">크기</option>
        </select>
        <button 
          class="btn btn-ghost btn-sm"
          on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
        >
          {#if sortOrder === 'asc'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path>
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"></path>
            </svg>
          {/if}
        </button>
      </div>
      
      <!-- 액션 버튼 -->
      <button class="btn btn-primary" on:click={handleUpload}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        자료 올리기
      </button>
      
      <button class="btn btn-success" on:click={handleCreate}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        자료 만들기
      </button>
    </div>
  </div>

  <!-- 로딩 상태 -->
  {#if $loading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- 자료 목록 -->
    {#if viewType === 'grid'}
      <!-- 카드 뷰 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {#each filteredMaterials as material}
          <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <div class="card-body">
              <div class="flex items-start justify-between mb-2">
                <div class="text-2xl">{getFileTypeIcon(material.file_type)}</div>
                <div class="dropdown dropdown-end">
                  <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                    </svg>
                  </div>
                  <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                    <li><button on:click={() => handleEdit(material)}>편집</button></li>
                    <li><button on:click={() => handleDelete(material)} class="text-error">삭제</button></li>
                  </ul>
                </div>
              </div>
              
              <h2 class="card-title text-sm mb-2">{material.title}</h2>
              
              <div class="text-xs text-base-content/70 space-y-1">
                {#if material.file_type}
                  <p>{material.file_type.split('/')[1].toUpperCase()}</p>
                {/if}
                {#if material.file_size}
                  <p>{formatFileSize(material.file_size)}</p>
                {/if}
                {#if material.pages}
                  <p>{material.pages}페이지</p>
                {/if}
                <p>{formatDate(material.created_at)}</p>
              </div>
              
              <div class="card-actions justify-end mt-4">
                <button 
                  class="btn btn-primary btn-sm" 
                  on:click={() => handleExtract(material)}
                >
                  문항 추출
                </button>
                <button 
                  class="btn btn-ghost btn-sm"
                  on:click={() => handleEdit(material)}
                >
                  편집
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- 리스트 뷰 -->
      <div class="bg-base-100 rounded-lg shadow">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>파일</th>
                <th>이름</th>
                <th>유형</th>
                <th>크기</th>
                <th>페이지</th>
                <th>생성일</th>
                <th class="text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredMaterials as material}
                <tr class="hover:bg-base-200">
                  <td>
                    <div class="text-2xl">{getFileTypeIcon(material.file_type)}</div>
                  </td>
                  <td>
                    <div class="font-medium">{material.title}</div>
                  </td>
                  <td>
                    <div class="badge badge-ghost">
                      {material.file_type ? material.file_type.split('/')[1].toUpperCase() : '-'}
                    </div>
                  </td>
                  <td>
                    <span class="text-sm">
                      {material.file_size ? formatFileSize(material.file_size) : '-'}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm">
                      {material.pages ? `${material.pages}페이지` : '-'}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-base-content/70">
                      {formatDate(material.created_at)}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="flex gap-2 justify-end">
                      <button 
                        class="btn btn-primary btn-xs" 
                        on:click={() => handleExtract(material)}
                      >
                        문항 추출
                      </button>
                      <div class="dropdown dropdown-end">
                        <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                          </svg>
                        </div>
                        <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                          <li><button on:click={() => handleEdit(material)}>편집</button></li>
                          <li><button on:click={() => handleDelete(material)} class="text-error">삭제</button></li>
                        </ul>
                      </div>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    
    <!-- 빈 상태 -->
    {#if filteredMaterials.length === 0}
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📁</div>
        <h3 class="text-lg font-medium mb-2">
          {type === 'original' ? '원본 자료가' : '제작한 자료가'} 없습니다
        </h3>
        <p class="text-base-content/70 mb-4">
          새 자료를 업로드하거나 만들어보세요
        </p>
        <div class="flex gap-2 justify-center">
          <button class="btn btn-primary" on:click={handleUpload}>자료 올리기</button>
          <button class="btn btn-outline" on:click={handleCreate}>자료 만들기</button>
        </div>
      </div>
    {/if}
  {/if}
</div>