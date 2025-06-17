<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { blocks, loading, fetchBlocks, deleteBlock, getDifficultyLabel, getQuestionTypeLabel, getDifficultyBadgeClass, getQuestionTypeIcon } from '$lib/stores/blocks.js';
  import { materials } from '$lib/stores/materials.js';
  
  let filteredBlocks = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let filterType = 'all';
  let filterDifficulty = 'all';
  let selectedMaterial = 'all';

  // 사용자가 변경될 때 데이터 재조회
  $: if ($user?.id) {
    loadBlocks();
  }

  // 검색, 필터, 정렬 적용
  $: {
    let filtered = $blocks.filter(block => {
      const matchesSearch = !searchTerm || 
        block.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = filterType === 'all' || block.type === filterType;
      const matchesDifficulty = filterDifficulty === 'all' || block.difficulty === filterDifficulty;
      const matchesMaterial = selectedMaterial === 'all' || block.material_id === selectedMaterial;
      
      return matchesSearch && matchesType && matchesDifficulty && matchesMaterial;
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

    filteredBlocks = filtered;
  }

  async function loadBlocks() {
    if ($user?.id) {
      await fetchBlocks($user.id);
    }
  }

  function handleUpload() {
    goto('/upload');
  }

  function handleCreate() {
    // TODO: 문항 만들기 페이지로 이동
    console.log('문항 만들기');
  }

  function handleEdit(block) {
    // TODO: 문항 편집 페이지로 이동
    console.log('문항 편집:', block);
  }

  async function handleDelete(block) {
    if (confirm(`"${block.question.substring(0, 30)}..."을(를) 삭제하시겠습니까?`)) {
      const { error } = await deleteBlock(block.id);
      if (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  }

  function getMaterialTitle(materialId) {
    const material = $materials.find(m => m.id === materialId);
    return material ? material.title : '알 수 없음';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  onMount(() => {
    if ($user?.id) {
      loadBlocks();
    }
  });
</script>

<div class="space-y-4">
  <!-- 상단 검색 및 필터 -->
  <div class="flex flex-col lg:flex-row gap-4 justify-between">
    <!-- 검색 -->
    <div class="flex-1 max-w-md">
      <input
        type="text"
        placeholder="문항 검색..."
        class="input input-bordered w-full"
        bind:value={searchTerm}
      />
    </div>
    
    <!-- 필터 및 정렬 -->
    <div class="flex gap-3 items-center flex-wrap">
      <!-- 자료 필터 -->
      <select class="select select-bordered select-sm" bind:value={selectedMaterial}>
        <option value="all">모든 자료</option>
        {#each $materials as material}
          <option value={material.id}>{material.title}</option>
        {/each}
      </select>
      
      <!-- 타입 필터 -->
      <select class="select select-bordered select-sm" bind:value={filterType}>
        <option value="all">모든 타입</option>
        <option value="multiple_choice">객관식</option>
        <option value="short_answer">단답형</option>
        <option value="essay">서술형</option>
        <option value="true_false">O/X</option>
      </select>
      
      <!-- 난이도 필터 -->
      <select class="select select-bordered select-sm" bind:value={filterDifficulty}>
        <option value="all">모든 난이도</option>
        <option value="easy">쉬움</option>
        <option value="medium">보통</option>
        <option value="hard">어려움</option>
      </select>
      
      <!-- 정렬 옵션 -->
      <div class="flex items-center gap-2">
        <select class="select select-bordered select-sm" bind:value={sortBy}>
          <option value="created_at">생성일</option>
          <option value="difficulty">난이도</option>
          <option value="type">타입</option>
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
        문항 만들기
      </button>
    </div>
  </div>
  
  <!-- 로딩 상태 -->
  {#if $loading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- 문항 목록 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredBlocks as block}
        <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div class="card-body">
            <div class="flex items-start justify-between mb-2">
              <div class="text-2xl">{getQuestionTypeIcon(block.type)}</div>
              <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                  </svg>
                </div>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                  <li><button on:click={() => handleEdit(block)}>편집</button></li>
                  <li><button on:click={() => handleDelete(block)} class="text-error">삭제</button></li>
                </ul>
              </div>
            </div>
            
            <div class="flex gap-2 mb-2">
              <div class="badge badge-primary badge-sm">
                {getQuestionTypeLabel(block.type)}
              </div>
              <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-sm">
                {getDifficultyLabel(block.difficulty)}
              </div>
            </div>
            
            <p class="text-sm text-base-content/70 line-clamp-3 mb-2">{block.question}</p>
            
            {#if block.correct_answer}
              <p class="text-sm mb-2">
                <span class="font-medium">정답:</span> 
                <span class="text-primary">{block.correct_answer}</span>
              </p>
            {/if}
            
            <!-- 메타 정보 -->
            <div class="text-xs text-base-content/70 space-y-1 mb-2">
              <p>자료: {getMaterialTitle(block.material_id)}</p>
              {#if block.page_number}
                <p>{block.page_number}페이지</p>
              {/if}
              <p>{formatDate(block.created_at)}</p>
            </div>
            
            <!-- 태그 -->
            {#if block.tags && block.tags.length > 0}
              <div class="flex flex-wrap gap-1 mb-2">
                {#each block.tags as tag}
                  <div class="badge badge-ghost badge-xs">{tag}</div>
                {/each}
              </div>
            {/if}
            
            <div class="card-actions justify-end mt-2">
              <button 
                class="btn btn-primary btn-sm" 
                on:click={() => handleEdit(block)}
              >
                편집
              </button>
            </div>
          </div>
        </div>
      {:else}
        <!-- 빈 상태 -->
        <div class="col-span-full text-center py-12">
          <div class="text-4xl mb-4">📝</div>
          <h3 class="text-lg font-medium mb-2">문항이 없습니다</h3>
          <p class="text-base-content/70 mb-4">
            자료를 업로드하고 문항을 추출하거나 직접 만들어보세요
          </p>
          <div class="flex gap-2 justify-center">
            <button class="btn btn-primary" on:click={handleUpload}>자료 올리기</button>
            <button class="btn btn-outline" on:click={handleCreate}>문항 만들기</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>