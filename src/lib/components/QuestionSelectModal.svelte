<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { blocks, loading, fetchBlocks, getDifficultyLabel, getBlockTypeLabel, getDifficultyBadgeClass, getBlockTypeIcon, getAllCustomTags, getAllChapters, getQuestionSubtypeLabel } from '$lib/stores/blocks.js';
  
  export let showModal = false;
  export let onSelect = () => {};
  export let onCancel = () => {};
  
  let filteredBlocks = [];
  let searchTerm = '';
  let filterTypes = [];
  let filterDifficulties = [];
  let filterSubjects = [];
  let selectedBlocks = new Set();
  let selectionOrder = [];
  let availableCustomTags = [];
  let availableChapters = [];
  
  // 사용자가 변경될 때 데이터 재조회
  $: if ($user?.id && showModal) {
    loadBlocks();
  }
  
  // 커스텀 태그 목록 업데이트
  $: availableCustomTags = getAllCustomTags($blocks);
  
  // 단원 목록 업데이트
  $: availableChapters = getAllChapters($blocks);
  
  // 검색, 필터 적용
  $: {
    let filtered = $blocks.filter(block => {
      const matchesSearch = !searchTerm || 
        block.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        block.custom_tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterTypes.length === 0 || filterTypes.includes(block.type);
      const matchesDifficulty = filterDifficulties.length === 0 || filterDifficulties.includes(block.difficulty);
      const matchesSubject = filterSubjects.length === 0 || (block.tags && block.tags.some(tag => filterSubjects.includes(tag)));
      
      return matchesSearch && matchesType && matchesDifficulty && matchesSubject;
    });
    
    filteredBlocks = filtered;
  }
  
  async function loadBlocks() {
    if ($user?.id) {
      await fetchBlocks($user.id);
    }
  }
  
  function toggleBlock(blockId) {
    if (selectedBlocks.has(blockId)) {
      selectedBlocks.delete(blockId);
      selectionOrder = selectionOrder.filter(id => id !== blockId);
    } else {
      selectedBlocks.add(blockId);
      selectionOrder.push(blockId);
    }
    selectedBlocks = new Set(selectedBlocks);
  }
  
  function handleConfirm() {
    const blocksMap = new Map(filteredBlocks.map(block => [block.id, block]));
    const selectedQuestions = selectionOrder
      .filter(id => selectedBlocks.has(id))
      .map(id => blocksMap.get(id))
      .filter(block => block !== undefined);
    
    onSelect(selectedQuestions);
    showModal = false;
  }
  
  function handleCancel() {
    onCancel();
    showModal = false;
    selectedBlocks = new Set();
    selectionOrder = [];
  }
  
  function getUniqueSubjects() {
    const subjects = new Set();
    $blocks.forEach(block => {
      if (block.tags && Array.isArray(block.tags)) {
        block.tags.forEach(tag => {
          if (['국어', '영어', '수학', '사회', '과학', '기타'].includes(tag)) {
            subjects.add(tag);
          }
        });
      }
    });
    return Array.from(subjects).sort();
  }
  
  function toggleFilter(filterArray, value) {
    const index = filterArray.indexOf(value);
    if (index > -1) {
      filterArray.splice(index, 1);
    } else {
      filterArray.push(value);
    }
    // 리액티브 업데이트 트리거
    if (filterArray === filterTypes) filterTypes = [...filterTypes];
    else if (filterArray === filterDifficulties) filterDifficulties = [...filterDifficulties];
    else if (filterArray === filterSubjects) filterSubjects = [...filterSubjects];
  }
</script>

{#if showModal}
  <div class="modal modal-open">
    <div class="modal-box max-w-6xl h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold">문항 선택</h3>
        <button class="btn btn-sm btn-ghost" on:click={handleCancel}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- Search and Filters -->
      <div class="space-y-4 mb-4">
        <!-- Search -->
        <div class="form-control">
          <input 
            type="text" 
            placeholder="문항 내용, 태그로 검색..."
            class="input input-bordered w-full"
            bind:value={searchTerm}
          />
        </div>
        
        <!-- Filters -->
        <div class="flex flex-wrap gap-4">
          <!-- Type Filter -->
          <div class="dropdown dropdown-bottom">
            <label tabindex="0" class="btn btn-sm btn-outline gap-2">
              유형
              {#if filterTypes.length > 0}
                <div class="badge badge-primary badge-sm">{filterTypes.length}</div>
              {/if}
            </label>
            <div tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              {#each ['question', 'text', 'image'] as type}
                <label class="label cursor-pointer">
                  <span class="label-text">{getBlockTypeLabel(type)}</span>
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    checked={filterTypes.includes(type)}
                    on:change={() => toggleFilter(filterTypes, type)}
                  />
                </label>
              {/each}
            </div>
          </div>
          
          <!-- Difficulty Filter -->
          <div class="dropdown dropdown-bottom">
            <label tabindex="0" class="btn btn-sm btn-outline gap-2">
              난이도
              {#if filterDifficulties.length > 0}
                <div class="badge badge-primary badge-sm">{filterDifficulties.length}</div>
              {/if}
            </label>
            <div tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              {#each ['상', '중', '하'] as difficulty}
                <label class="label cursor-pointer">
                  <span class="label-text">{getDifficultyLabel(difficulty)}</span>
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    checked={filterDifficulties.includes(difficulty)}
                    on:change={() => toggleFilter(filterDifficulties, difficulty)}
                  />
                </label>
              {/each}
            </div>
          </div>
          
          <!-- Subject Filter -->
          <div class="dropdown dropdown-bottom">
            <label tabindex="0" class="btn btn-sm btn-outline gap-2">
              과목
              {#if filterSubjects.length > 0}
                <div class="badge badge-primary badge-sm">{filterSubjects.length}</div>
              {/if}
            </label>
            <div tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              {#each getUniqueSubjects() as subject}
                <label class="label cursor-pointer">
                  <span class="label-text">{subject}</span>
                  <input 
                    type="checkbox" 
                    class="checkbox checkbox-sm"
                    checked={filterSubjects.includes(subject)}
                    on:change={() => toggleFilter(filterSubjects, subject)}
                  />
                </label>
              {/each}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Selected count -->
      {#if selectedBlocks.size > 0}
        <div class="alert alert-info mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{selectedBlocks.size}개 문항이 선택되었습니다</span>
        </div>
      {/if}
      
      <!-- Blocks List -->
      <div class="flex-1 overflow-y-auto">
        {#if $loading}
          <div class="flex justify-center items-center h-32">
            <span class="loading loading-spinner loading-lg"></span>
          </div>
        {:else if filteredBlocks.length === 0}
          <div class="text-center py-8 text-base-content/70">
            검색 결과가 없습니다
          </div>
        {:else}
          <!-- 카드 그리드 뷰 -->
          <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
            {#each filteredBlocks as block}
              <div 
                class="card shadow hover:shadow-lg transition-shadow cursor-pointer bg-base-100 {selectedBlocks.has(block.id) ? 'ring-2 ring-primary' : ''}"
                style="max-width: 350px; border-width: 2px;"
                on:click={() => toggleBlock(block.id)}
              >
                <div class="card-body p-3">
                  <!-- 체크박스 -->
                  <div class="flex items-center justify-between gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      class="checkbox checkbox-sm"
                      checked={selectedBlocks.has(block.id)}
                      on:click|stopPropagation
                      on:change={() => toggleBlock(block.id)}
                    />
                  </div>
                  
                  <!-- 출처와 문제 번호 -->
                  <div class="mb-2">
                    <p class="text-sm font-semibold text-gray-700 truncate" title={block.material_title}>
                      {block.material_title || '원본 자료'}
                    </p>
                    <p class="text-xs text-gray-500">
                      p.{block.page_number || '?'} {block.title || ''}
                    </p>
                  </div>
                  
                  <!-- 블록 정보 배지들 -->
                  <div class="flex flex-wrap gap-1 mb-1">
                    {#if block.type === 'question' && block.subtype}
                      <div class="badge badge-sm badge-ghost">
                        {getQuestionSubtypeLabel(block.subtype)}
                      </div>
                    {/if}
                    <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-sm">
                      {getDifficultyLabel(block.difficulty)}
                    </div>
                    {#if block.score}
                      <div class="badge badge-info badge-sm">{block.score}점</div>
                    {/if}
                  </div>
                  
                  <!-- 이미지 미리보기 -->
                  {#if block.image_data}
                    <div class="mb-1">
                      <img 
                        src={block.image_data} 
                        alt="문항 이미지"
                        class="w-full h-32 object-contain rounded border border-base-300 bg-gray-50"
                        loading="lazy"
                      />
                    </div>
                  {/if}
                  
                  <!-- 내용 미리보기 -->
                  <p class="text-sm line-clamp-2 mb-1">{block.content || ''}</p>
                  
                  <!-- 추가 메타데이터 -->
                  {#if block.chapter}
                    <p class="text-xs text-base-content/50 truncate mb-1">
                      단원: {block.chapter}
                    </p>
                  {/if}
                  
                  <!-- 태그들 -->
                  {#if (block.tags && block.tags.length > 0) || (block.custom_tags && block.custom_tags.length > 0)}
                    <div class="flex flex-wrap gap-1 mt-2">
                      {#if block.tags && block.tags.length > 0}
                        {#each block.tags.slice(0, 2) as tag}
                          <div class="badge badge-outline badge-xs">{tag}</div>
                        {/each}
                      {/if}
                      {#if block.custom_tags && block.custom_tags.length > 0}
                        {#each block.custom_tags.slice(0, 2) as tag}
                          <div class="badge badge-info badge-xs">{tag}</div>
                        {/each}
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Actions -->
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={handleCancel}>취소</button>
        <button 
          class="btn btn-primary" 
          on:click={handleConfirm}
          disabled={selectedBlocks.size === 0}
        >
          {selectedBlocks.size}개 문항 선택 완료
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={handleCancel}></div>
  </div>
{/if}