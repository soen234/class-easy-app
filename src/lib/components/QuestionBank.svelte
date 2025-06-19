<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { blocks, loading, fetchBlocks, deleteBlock, updateBlock, getDifficultyLabel, getBlockTypeLabel, getQuestionSubtypeLabel, getDifficultyBadgeClass, getBlockTypeIcon, getQuestionSubtypeIcon, getAllCustomTags } from '$lib/stores/blocks.js';
  
  let filteredBlocks = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let filterTypes = [];
  let filterSubtypes = [];
  let filterDifficulties = [];
  let filterSubjects = [];
  let filterCustomTags = [];
  let viewType = 'grid';
  let selectedBlocks = new Set();
  let showCreateFromSelected = false;
  let showEditModal = false;
  let editingBlock = null;
  let availableCustomTags = [];
  
  // 사용자가 변경될 때 데이터 재조회
  $: if ($user?.id) {
    loadBlocks();
  }

  // 선택된 문항이 있을 때만 버튼 표시
  $: showCreateFromSelected = selectedBlocks.size > 0;
  
  // 커스텀 태그 목록 업데이트
  $: availableCustomTags = getAllCustomTags($blocks);

  // 검색, 필터, 정렬 적용
  $: {
    let filtered = $blocks.filter(block => {
      const matchesSearch = !searchTerm || 
        block.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        block.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        block.custom_tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterTypes.length === 0 || filterTypes.includes(block.type);
      const matchesSubtype = filterSubtypes.length === 0 || !block.subtype || filterSubtypes.includes(block.subtype);
      const matchesDifficulty = filterDifficulties.length === 0 || filterDifficulties.includes(block.difficulty);
      const matchesSubject = filterSubjects.length === 0 || (block.tags && block.tags.some(tag => filterSubjects.includes(tag)));
      const matchesCustomTags = filterCustomTags.length === 0 || (block.custom_tags && filterCustomTags.some(tag => block.custom_tags.includes(tag)));
      
      return matchesSearch && matchesType && matchesSubtype && matchesDifficulty && matchesSubject && matchesCustomTags;
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

  function handleCreate() {
    goto('/templates');
  }

  function handleCreateFromSelected() {
    // 선택된 문항들을 localStorage에 저장
    const selectedQuestions = filteredBlocks.filter(block => selectedBlocks.has(block.id));
    localStorage.setItem('selectedQuestions', JSON.stringify(selectedQuestions));
    goto('/templates?from=question-bank');
  }

  function toggleBlockSelection(blockId) {
    if (selectedBlocks.has(blockId)) {
      selectedBlocks.delete(blockId);
    } else {
      selectedBlocks.add(blockId);
    }
    selectedBlocks = new Set(selectedBlocks);
  }

  function toggleAllSelection() {
    if (selectedBlocks.size === filteredBlocks.length) {
      selectedBlocks = new Set();
    } else {
      selectedBlocks = new Set(filteredBlocks.map(block => block.id));
    }
  }

  function handleEdit(block) {
    editingBlock = { ...block };
    if (!editingBlock.custom_tags) {
      editingBlock.custom_tags = [];
    }
    showEditModal = true;
  }

  async function handleDelete(block) {
    if (confirm(`"${block.content?.substring(0, 30)}..."을(를) 삭제하시겠습니까?`)) {
      const { error } = await deleteBlock(block.id);
      if (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  }
  
  async function saveBlock() {
    if (!editingBlock) return;
    
    const { error } = await updateBlock(editingBlock.id, {
      content: editingBlock.content,
      type: editingBlock.type,
      subtype: editingBlock.subtype,
      difficulty: editingBlock.difficulty,
      tags: editingBlock.tags,
      custom_tags: editingBlock.custom_tags,
      correct_answer: editingBlock.correct_answer,
      options: editingBlock.options
    });
    
    if (error) {
      alert('수정 중 오류가 발생했습니다.');
    } else {
      showEditModal = false;
      editingBlock = null;
      await loadBlocks();
    }
  }
  
  function addCustomTag(tag) {
    if (tag && editingBlock && !editingBlock.custom_tags.includes(tag)) {
      editingBlock.custom_tags = [...editingBlock.custom_tags, tag];
    }
  }
  
  function removeCustomTag(tag) {
    if (editingBlock) {
      editingBlock.custom_tags = editingBlock.custom_tags.filter(t => t !== tag);
    }
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
    else if (filterArray === filterSubtypes) filterSubtypes = [...filterSubtypes];
    else if (filterArray === filterDifficulties) filterDifficulties = [...filterDifficulties];
    else if (filterArray === filterSubjects) filterSubjects = [...filterSubjects];
    else if (filterArray === filterCustomTags) filterCustomTags = [...filterCustomTags];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }

  onMount(() => {
    if ($user?.id) {
      loadBlocks();
    }
  });
  
  let newCustomTag = '';
</script>

<div class="space-y-4">
  <!-- 상단 검색 및 뷰 컨트롤 -->
  <div class="flex flex-col lg:flex-row gap-4 justify-between">
    <!-- 검색 -->
    <div class="flex-1 max-w-md">
      <input
        type="text"
        placeholder="블록 내용, 태그 검색..."
        class="input input-bordered w-full"
        bind:value={searchTerm}
      />
    </div>
    
    <!-- 뷰 컨트롤 및 정렬 -->
    <div class="flex gap-3 items-center flex-wrap">
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
      {#if showCreateFromSelected}
        <button class="btn btn-primary" on:click={handleCreateFromSelected}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          선택된 블록으로 자료 만들기 ({selectedBlocks.size}개)
        </button>
      {/if}
      <button class="btn btn-success" on:click={handleCreate}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        자료 만들기
      </button>
    </div>
  </div>

  <!-- 필터 패널 -->
  <div class="bg-base-100 rounded-lg shadow">
    <div class="collapse collapse-arrow">
      <input type="checkbox" checked />
      <div class="collapse-title font-medium">
        필터
      </div>
      <div class="collapse-content">
        <div class="space-y-4">
          <!-- 블록 타입 필터 -->
          <div class="border-b pb-4">
            <h4 class="font-medium mb-2">블록 타입</h4>
            <div class="flex flex-wrap gap-2">
              {#each [
                { value: 'question', label: '문항' },
                { value: 'passage', label: '지문' },
                { value: 'concept', label: '개념' },
                { value: 'formula', label: '공식' },
                { value: 'example', label: '예제' },
                { value: 'note', label: '참고' }
              ] as type}
                <label class="label cursor-pointer">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm mr-2"
                    checked={filterTypes.includes(type.value)}
                    on:change={() => toggleFilter(filterTypes, type.value)}
                  />
                  <span class="label-text">{type.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- 문항 서브타입 필터 -->
          <div class="border-b pb-4">
            <h4 class="font-medium mb-2">문항 유형</h4>
            <div class="flex flex-wrap gap-2">
              {#each [
                { value: 'multiple_choice', label: '객관식' },
                { value: 'short_answer', label: '단답형' },
                { value: 'essay', label: '서술형' },
                { value: 'true_false', label: 'O/X' }
              ] as subtype}
                <label class="label cursor-pointer">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm mr-2"
                    checked={filterSubtypes.includes(subtype.value)}
                    on:change={() => toggleFilter(filterSubtypes, subtype.value)}
                  />
                  <span class="label-text">{subtype.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- 난이도 필터 -->
          <div class="border-b pb-4">
            <h4 class="font-medium mb-2">난이도</h4>
            <div class="flex flex-wrap gap-2">
              {#each [
                { value: 'easy', label: '쉬움' },
                { value: 'medium', label: '보통' },
                { value: 'hard', label: '어려움' }
              ] as difficulty}
                <label class="label cursor-pointer">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm mr-2"
                    checked={filterDifficulties.includes(difficulty.value)}
                    on:change={() => toggleFilter(filterDifficulties, difficulty.value)}
                  />
                  <span class="label-text">{difficulty.label}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- 과목 필터 -->
          <div class="border-b pb-4">
            <h4 class="font-medium mb-2">과목</h4>
            <div class="flex flex-wrap gap-2">
              {#each getUniqueSubjects() as subject}
                <label class="label cursor-pointer">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm mr-2"
                    checked={filterSubjects.includes(subject)}
                    on:change={() => toggleFilter(filterSubjects, subject)}
                  />
                  <span class="label-text">{subject}</span>
                </label>
              {/each}
            </div>
          </div>

          <!-- 커스텀 태그 필터 -->
          {#if availableCustomTags.length > 0}
            <div>
              <h4 class="font-medium mb-2">커스텀 태그</h4>
              <div class="flex flex-wrap gap-2">
                {#each availableCustomTags as tag}
                  <label class="label cursor-pointer">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm mr-2"
                      checked={filterCustomTags.includes(tag)}
                      on:change={() => toggleFilter(filterCustomTags, tag)}
                    />
                    <span class="label-text">{tag}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  
  <!-- 로딩 상태 -->
  {#if $loading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- 블록 목록 -->
    {#if viewType === 'grid'}
      <!-- 카드 뷰 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {#each filteredBlocks as block}
          <div class="card bg-base-100 shadow hover:shadow-lg transition-shadow {selectedBlocks.has(block.id) ? 'ring-2 ring-primary' : ''}" style="min-width: 200px; max-width: 350px;">
            <div class="card-body p-4">
              <div class="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  checked={selectedBlocks.has(block.id)}
                  on:change={() => toggleBlockSelection(block.id)}
                />
                <div class="text-2xl">{getBlockTypeIcon(block.type)}</div>
                <div class="flex-1 flex items-center justify-end">
                  <div class="dropdown dropdown-end">
                    <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </div>
                    <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                      <li><button on:click={() => handleEdit(block)}>편집</button></li>
                      <li><button on:click={() => handleDelete(block)} class="text-error">삭제</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-1 mb-2">
                <div class="badge badge-ghost badge-xs">
                  {getBlockTypeLabel(block.type)}
                </div>
                {#if block.subtype}
                  <div class="badge badge-primary badge-xs">
                    {getQuestionSubtypeLabel(block.subtype)}
                  </div>
                {/if}
                <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-xs">
                  {getDifficultyLabel(block.difficulty)}
                </div>
              </div>
              
              <p class="text-sm line-clamp-3 mb-2">{block.content || ''}</p>
              
              {#if block.correct_answer}
                <p class="text-xs text-base-content/70 truncate">
                  정답: {block.correct_answer}
                </p>
              {/if}
              
              <div class="flex flex-wrap gap-1 mt-2">
                {#if block.custom_tags}
                  {#each block.custom_tags.slice(0, 3) as tag}
                    <div class="badge badge-outline badge-xs">{tag}</div>
                  {/each}
                  {#if block.custom_tags.length > 3}
                    <div class="badge badge-ghost badge-xs">+{block.custom_tags.length - 3}</div>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- 리스트 뷰 -->
      <div class="bg-base-100 rounded-lg shadow">
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selectedBlocks.size === filteredBlocks.length && filteredBlocks.length > 0}
                    on:change={toggleAllSelection}
                  />
                </th>
                <th>타입</th>
                <th>내용</th>
                <th>난이도</th>
                <th>커스텀 태그</th>
                <th>생성일</th>
                <th class="text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredBlocks as block}
                <tr class="hover {selectedBlocks.has(block.id) ? 'bg-primary/10' : ''}">
                  <td>
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm"
                      checked={selectedBlocks.has(block.id)}
                      on:change={() => toggleBlockSelection(block.id)}
                    />
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{getBlockTypeIcon(block.type)}</span>
                      <div>
                        <div class="text-sm font-medium">{getBlockTypeLabel(block.type)}</div>
                        {#if block.subtype}
                          <div class="text-xs text-base-content/70">{getQuestionSubtypeLabel(block.subtype)}</div>
                        {/if}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="max-w-md">
                      <p class="text-sm truncate">{block.content || ''}</p>
                      {#if block.correct_answer}
                        <p class="text-xs text-base-content/70">정답: {block.correct_answer}</p>
                      {/if}
                    </div>
                  </td>
                  <td>
                    <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-sm">
                      {getDifficultyLabel(block.difficulty)}
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1 max-w-xs">
                      {#if block.custom_tags}
                        {#each block.custom_tags as tag}
                          <div class="badge badge-outline badge-xs">{tag}</div>
                        {/each}
                      {/if}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm">{formatDate(block.created_at)}</div>
                  </td>
                  <td class="text-right">
                    <div class="dropdown dropdown-end">
                      <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                      </div>
                      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow">
                        <li><button on:click={() => handleEdit(block)}>편집</button></li>
                        <li><button on:click={() => handleDelete(block)} class="text-error">삭제</button></li>
                      </ul>
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
    {#if filteredBlocks.length === 0}
      <div class="text-center py-12">
        <div class="text-4xl mb-4">📝</div>
        <h3 class="text-lg font-medium mb-2">블록이 없습니다</h3>
        <p class="text-base-content/70 mb-4">
          자료를 업로드하고 블록을 추출하거나 직접 만들어보세요
        </p>
        <div class="flex gap-2 justify-center">
          <button class="btn btn-outline" on:click={handleCreate}>자료 만들기</button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- 편집 모달 -->
{#if showEditModal && editingBlock}
  <div class="modal modal-open">
    <div class="modal-box max-w-3xl">
      <h3 class="font-bold text-lg mb-4">블록 편집</h3>
      
      <div class="space-y-4">
        <!-- 블록 타입 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">블록 타입</span>
          </label>
          <select class="select select-bordered" bind:value={editingBlock.type}>
            <option value="question">문항</option>
            <option value="passage">지문</option>
            <option value="concept">개념</option>
            <option value="formula">공식</option>
            <option value="example">예제</option>
            <option value="note">참고</option>
          </select>
        </div>
        
        <!-- 문항 서브타입 (문항인 경우만) -->
        {#if editingBlock.type === 'question'}
          <div class="form-control">
            <label class="label">
              <span class="label-text">문항 유형</span>
            </label>
            <select class="select select-bordered" bind:value={editingBlock.subtype}>
              <option value="multiple_choice">객관식</option>
              <option value="short_answer">단답형</option>
              <option value="essay">서술형</option>
              <option value="true_false">O/X</option>
            </select>
          </div>
        {/if}
        
        <!-- 내용 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">내용</span>
          </label>
          <textarea 
            class="textarea textarea-bordered h-32" 
            bind:value={editingBlock.content}
            placeholder="블록 내용을 입력하세요"
          ></textarea>
        </div>
        
        <!-- 난이도 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">난이도</span>
          </label>
          <select class="select select-bordered" bind:value={editingBlock.difficulty}>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
        </div>
        
        <!-- 정답 (문항인 경우만) -->
        {#if editingBlock.type === 'question'}
          <div class="form-control">
            <label class="label">
              <span class="label-text">정답</span>
            </label>
            <input 
              type="text" 
              class="input input-bordered" 
              bind:value={editingBlock.correct_answer}
              placeholder="정답을 입력하세요"
            />
          </div>
        {/if}
        
        <!-- 커스텀 태그 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">커스텀 태그</span>
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered flex-1"
              bind:value={newCustomTag}
              placeholder="새 태그 입력"
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  addCustomTag(newCustomTag);
                  newCustomTag = '';
                }
              }}
            />
            <button 
              class="btn btn-primary"
              on:click={() => {
                addCustomTag(newCustomTag);
                newCustomTag = '';
              }}
            >
              추가
            </button>
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            {#each editingBlock.custom_tags as tag}
              <div class="badge badge-primary gap-2">
                {tag}
                <button on:click={() => removeCustomTag(tag)}>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            {/each}
          </div>
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn" on:click={() => showEditModal = false}>취소</button>
        <button class="btn btn-primary" on:click={saveBlock}>저장</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showEditModal = false}>close</button>
    </form>
  </div>
{/if}