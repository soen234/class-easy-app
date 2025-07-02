<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { blocks, loading, fetchBlocks, deleteBlock, deleteBlocks, updateBlock, getDifficultyLabel, getBlockTypeLabel, getQuestionSubtypeLabel, getDifficultyBadgeClass, getBlockTypeIcon, getQuestionSubtypeIcon, getAllCustomTags, getAllChapters, collection, addToCollection, removeFromCollection, clearCollection, isInCollection, createThumbnail } from '$lib/stores/blocks.js';
  import { supabase } from '$lib/supabase.js';
  
  let filteredBlocks = [];
  let displayedBlocks = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let filterTypes = [];
  let filterSubtypes = [];
  let filterDifficulties = [];
  let filterSubjects = [];
  let filterCustomTags = [];
  let filterChapters = [];
  let viewType = 'grid';
  let selectedBlocks = new Set();
  let showCreateFromSelected = false;
  let showEditModal = false;
  let editingBlock = null;
  let availableCustomTags = [];
  let availableChapters = [];
  let showImageModal = false;
  let modalImageData = null;
  let showCollectionPanel = true;
  let showDetailModal = false;
  let detailBlock = null;
  
  // 무한 스크롤 관련 변수
  let itemsPerLoad = 20;
  let currentLoadIndex = 0;
  let isLoadingMore = false;
  let scrollContainer;
  
  // 사용자가 변경될 때 데이터 재조회
  $: if ($user?.id) {
    loadBlocks();
  }

  // 선택된 문항이 있을 때만 버튼 표시
  $: showCreateFromSelected = selectedBlocks.size > 0;
  
  // 커스텀 태그 목록 업데이트
  $: availableCustomTags = getAllCustomTags($blocks);
  
  // 단원 목록 업데이트
  $: availableChapters = getAllChapters($blocks);

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
      const matchesChapter = filterChapters.length === 0 || filterChapters.includes(block.chapter);
      
      return matchesSearch && matchesType && matchesSubtype && matchesDifficulty && matchesSubject && matchesCustomTags && matchesChapter;
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
    // 필터가 변경되면 표시 인덱스 리셋
    currentLoadIndex = 0;
    loadMoreBlocks();
  }

  async function loadBlocks() {
    if ($user?.id) {
      await fetchBlocks($user.id);
    }
  }
  
  // 블록을 점진적으로 로드
  function loadMoreBlocks() {
    if (isLoadingMore) return;
    
    const startIndex = currentLoadIndex;
    const endIndex = Math.min(startIndex + itemsPerLoad, filteredBlocks.length);
    
    if (startIndex === 0) {
      displayedBlocks = filteredBlocks.slice(startIndex, endIndex);
    } else {
      displayedBlocks = [...displayedBlocks, ...filteredBlocks.slice(startIndex, endIndex)];
    }
    
    currentLoadIndex = endIndex;
  }
  
  // 스크롤 이벤트 핸들러
  function handleScroll() {
    if (!scrollContainer) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    
    // 스크롤이 하단에 가까워지면 더 로드
    if (scrollTop + clientHeight >= scrollHeight - 100 && currentLoadIndex < filteredBlocks.length) {
      loadMoreBlocks();
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
  
  // 현재 표시된 항목만 선택
  function toggleDisplayedSelection() {
    const allDisplayedSelected = displayedBlocks.every(block => selectedBlocks.has(block.id));
    
    if (allDisplayedSelected) {
      displayedBlocks.forEach(block => selectedBlocks.delete(block.id));
    } else {
      displayedBlocks.forEach(block => selectedBlocks.add(block.id));
    }
    selectedBlocks = new Set(selectedBlocks);
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
  
  async function handleBulkDelete() {
    if (selectedBlocks.size === 0) return;
    
    if (confirm(`선택한 ${selectedBlocks.size}개의 블록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      const blockIds = Array.from(selectedBlocks);
      
      // 일괄 삭제 실행
      const { error } = await deleteBlocks(blockIds);
      
      if (error) {
        alert('블록 삭제 중 오류가 발생했습니다.');
        console.error('Bulk delete error:', error);
      } else {
        alert(`${blockIds.length}개 블록이 성공적으로 삭제되었습니다.`);
      }
      
      // 선택 초기화
      selectedBlocks = new Set();
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
    else if (filterArray === filterChapters) filterChapters = [...filterChapters];
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }
  
  function showImage(imageData) {
    modalImageData = imageData;
    showImageModal = true;
  }
  
  function handleAddToCollection(block) {
    addToCollection(block);
  }
  
  function handleRemoveFromCollection(blockId) {
    removeFromCollection(blockId);
  }
  
  function handleCreateFromCollection() {
    // 컬렉션의 문항들을 localStorage에 저장
    localStorage.setItem('selectedQuestions', JSON.stringify($collection));
    goto('/templates?from=collection');
  }
  
  function showDetail(block) {
    detailBlock = block;
    showDetailModal = true;
  }
  
  // 썸네일 생성을 위한 변수
  let thumbnails = {};
  
  // 블록이 변경될 때마다 썸네일 생성
  $: {
    filteredBlocks.forEach(async (block) => {
      if (block.image_data && !thumbnails[block.id]) {
        const thumbnail = await createThumbnail(block.image_data);
        thumbnails = { ...thumbnails, [block.id]: thumbnail };
      }
    });
  }

  onMount(() => {
    if ($user?.id) {
      loadBlocks();
    }
  });
  
  let newCustomTag = '';
  
  // 블록 타입별 색상 정의 (extract 페이지와 동일)
  const blockTypeColors = {
    question: '#3B82F6',    // Blue
    passage: '#F59E0B',     // Amber
    concept: '#8B5CF6',     // Violet
    explanation: '#10B981'  // Emerald
  };
  
  // 블록 타입별 배경색 (연한 색)
  const blockTypeBgColors = {
    question: 'bg-blue-50 border-blue-200',
    passage: 'bg-amber-50 border-amber-200',
    concept: 'bg-violet-50 border-violet-200',
    explanation: 'bg-emerald-50 border-emerald-200'
  };
  
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
      <button class="btn btn-ghost btn-sm" on:click={toggleAllSelection}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
        </svg>
        {#if selectedBlocks.size === filteredBlocks.length && filteredBlocks.length > 0}
          전체 해제
        {:else}
          전체 선택 ({filteredBlocks.length})
        {/if}
      </button>
      
      {#if showCreateFromSelected}
        <button class="btn btn-error btn-sm" on:click={handleBulkDelete}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          선택 삭제 ({selectedBlocks.size}개)
        </button>
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
        <div class="space-y-2">
          <!-- 블록 타입 필터 -->
          <div class="flex items-start gap-4">
            <div class="w-24 font-medium text-sm pt-2">블록 타입</div>
            <div class="flex-1 flex flex-wrap gap-2">
              {#each [
                { value: 'question', label: '문항' },
                { value: 'concept', label: '개념' },
                { value: 'passage', label: '지문' },
                { value: 'explanation', label: '해설' }
              ] as type}
                <label class="label cursor-pointer py-1">
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
          <div class="flex items-start gap-4">
            <div class="w-24 font-medium text-sm pt-2">문항 유형</div>
            <div class="flex-1 flex flex-wrap gap-2">
              {#each [
                { value: 'multiple_choice', label: '객관식' },
                { value: 'short_answer', label: '단답형' },
                { value: 'essay', label: '서술형' },
                { value: 'true_false', label: 'O/X' }
              ] as subtype}
                <label class="label cursor-pointer py-1">
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
          <div class="flex items-start gap-4">
            <div class="w-24 font-medium text-sm pt-2">난이도</div>
            <div class="flex-1 flex flex-wrap gap-2">
              {#each [
                { value: 'very_easy', label: '매우 쉬움' },
                { value: 'easy', label: '쉬움' },
                { value: 'medium', label: '보통' },
                { value: 'hard', label: '어려움' },
                { value: 'very_hard', label: '매우 어려움' }
              ] as difficulty}
                <label class="label cursor-pointer py-1">
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
          <div class="flex items-start gap-4">
            <div class="w-24 font-medium text-sm pt-2">과목</div>
            <div class="flex-1 flex flex-wrap gap-2">
              {#each getUniqueSubjects() as subject}
                <label class="label cursor-pointer py-1">
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
          
          <!-- 단원 필터 -->
          {#if availableChapters.length > 0}
            <div class="flex items-start gap-4">
              <div class="w-24 font-medium text-sm pt-2">단원</div>
              <div class="flex-1 flex flex-wrap gap-2">
                {#each availableChapters as chapter}
                  <label class="label cursor-pointer py-1">
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm mr-2"
                      checked={filterChapters.includes(chapter)}
                      on:change={() => toggleFilter(filterChapters, chapter)}
                    />
                    <span class="label-text">{chapter}</span>
                  </label>
                {/each}
              </div>
            </div>
          {/if}

          <!-- 커스텀 태그 필터 -->
          {#if availableCustomTags.length > 0}
            <div class="flex items-start gap-4">
              <div class="w-24 font-medium text-sm pt-2">커스텀 태그</div>
              <div class="flex-1 flex flex-wrap gap-2">
                {#each availableCustomTags as tag}
                  <label class="label cursor-pointer py-1">
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
      <div class="grid gap-4" style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">
        {#each displayedBlocks as block}
          <div class="card shadow hover:shadow-lg transition-shadow cursor-pointer {blockTypeBgColors[block.type] || 'bg-base-100'} {selectedBlocks.has(block.id) ? 'ring-2 ring-primary' : ''}" 
               style="max-width: 350px; border-width: 2px;" 
               on:click={() => showDetail(block)}>
            <div class="card-body p-3">
              <div class="flex items-center justify-between gap-2 mb-2">
                <input
                  type="checkbox"
                  class="checkbox checkbox-sm"
                  checked={selectedBlocks.has(block.id)}
                  on:click|stopPropagation
                  on:change={() => toggleBlockSelection(block.id)}
                />
                <!-- 컬렉션 추가/제거 버튼 -->
                {#if isInCollection(block.id, $collection)}
                  <button 
                    class="btn btn-xs btn-outline btn-error"
                    on:click|stopPropagation={() => handleRemoveFromCollection(block.id)}
                  >
                    컬렉션에서 제거
                  </button>
                {:else}
                  <button 
                    class="btn btn-xs btn-outline btn-primary"
                    on:click|stopPropagation={() => handleAddToCollection(block)}
                  >
                    컬렉션에 추가
                  </button>
                {/if}
              </div>
              
              <!-- 출처와 페이지 정보 -->
              <div class="mb-2">
                <p class="text-sm font-semibold text-gray-700 truncate" title={block.material_title}>
                  {block.material_title || '자료'}
                </p>
                <p class="text-xs text-gray-500">
                  p{block.page_number || '?'} {block.title}
                </p>
              </div>
              
              <!-- 블록 정보 배지들 -->
              <div class="flex flex-wrap gap-1 mb-1">
                {#if block.subtype}
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
                <div class="mb-1 cursor-pointer" on:click|stopPropagation={() => showImage(block.image_data)}>
                  <img 
                    src={thumbnails[block.id] || block.image_data} 
                    alt="문항 이미지"
                    class="w-full h-32 object-contain rounded border border-base-300 bg-gray-50"
                    loading="lazy"
                  />
                </div>
              {/if}
              
              <p class="text-sm line-clamp-2 mb-1">{block.content || ''}</p>
              
              {#if block.chapter}
                <p class="text-xs text-base-content/50 truncate mb-1">
                  단원: {block.chapter}
                </p>
              {/if}
              
              {#if block.custom_tags && block.custom_tags.length > 0}
                <div class="flex flex-wrap gap-1">
                  {#each block.custom_tags.slice(0, 3) as tag}
                    <div class="badge badge-outline badge-xs">{tag}</div>
                  {/each}
                  {#if block.custom_tags.length > 3}
                    <div class="badge badge-ghost badge-xs">+{block.custom_tags.length - 3}</div>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- 리스트 뷰 -->
      <div class="bg-base-100 rounded-lg shadow">
        <div class="overflow-x-auto">
          <table class="table table-sm w-full">
            <thead>
              <tr>
                <th class="w-10">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selectedBlocks.size === filteredBlocks.length && filteredBlocks.length > 0}
                    on:change={toggleAllSelection}
                  />
                </th>
                <th class="w-20 min-w-[5rem]">이미지</th>
                <th class="w-40 min-w-[10rem]">출처</th>
                <th class="w-16 text-center">페이지</th>
                <th class="w-24 min-w-[6rem]">문항 번호</th>
                <th class="w-24 min-w-[6rem]">유형</th>
                <th>내용</th>
                <th class="w-24 min-w-[6rem]">정답</th>
                <th class="w-16 text-center">배점</th>
                <th class="w-28 min-w-[7rem]">난이도</th>
                <th class="w-32 min-w-[8rem]">단원</th>
                <th class="w-24 min-w-[6rem]">생성일</th>
                <th class="w-16 text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each displayedBlocks as block}
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
                    {#if block.image_data}
                      <div 
                        class="w-20 h-20 cursor-pointer" 
                        on:click={() => showImage(block.image_data)}
                      >
                        <img 
                          src={thumbnails[block.id] || block.image_data} 
                          alt="미리보기"
                          class="w-full h-full object-contain rounded bg-gray-50 border border-base-300"
                          loading="lazy"
                        />
                      </div>
                    {:else}
                      <div class="w-20 h-20 bg-base-200 rounded flex items-center justify-center">
                        <svg class="w-8 h-8 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    {/if}
                  </td>
                  <!-- 출처 -->
                  <td>
                    <div class="text-sm font-medium line-clamp-3 max-w-[150px]" title={block.material_title}>
                      {block.material_title || '자료'}
                    </div>
                  </td>
                  <!-- 페이지 -->
                  <td class="text-center">
                    <span class="text-sm">{block.page_number || '-'}</span>
                  </td>
                  <!-- 문항 -->
                  <td>
                    <div 
                      class="inline-block px-2 py-1 rounded text-xs whitespace-nowrap"
                      style="background-color: {blockTypeColors[block.type]}20; border-left: 3px solid {blockTypeColors[block.type]}"
                    >
                      {block.title}
                    </div>
                  </td>
                  <!-- 유형 -->
                  <td>
                    {#if block.subtype}
                      <span class="badge badge-sm badge-ghost">
                        {getQuestionSubtypeLabel(block.subtype)}
                      </span>
                    {:else}
                      <span class="text-sm text-base-content/50">-</span>
                    {/if}
                  </td>
                  <!-- 내용 -->
                  <td>
                    {#if block.content}
                      <p class="text-sm truncate max-w-[300px]" title={block.content}>
                        {block.content}
                      </p>
                    {:else if block.image_data}
                      <span class="text-sm text-base-content/50 italic">[이미지 문항]</span>
                    {:else}
                      <span class="text-sm text-base-content/50">-</span>
                    {/if}
                  </td>
                  <!-- 정답 -->
                  <td>
                    <span class="text-sm {block.correct_answer ? 'font-medium' : 'text-base-content/50'}">
                      {block.correct_answer || '-'}
                    </span>
                  </td>
                  <!-- 배점 -->
                  <td class="text-center">
                    <span class="text-sm">
                      {block.score ? `${block.score}점` : '-'}
                    </span>
                  </td>
                  <!-- 난이도 -->
                  <td>
                    <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-sm whitespace-nowrap">
                      {getDifficultyLabel(block.difficulty)}
                    </div>
                  </td>
                  <!-- 단원 -->
                  <td>
                    <div class="text-sm truncate">
                      {block.chapter || '-'}
                    </div>
                  </td>
                  <!-- 생성일 -->
                  <td class="whitespace-nowrap">
                    <div class="text-sm">{formatDate(block.created_at)}</div>
                  </td>
                  <!-- 액션 -->
                  <td class="text-right">
                    <div class="flex justify-end gap-1">
                      <button 
                        class="btn btn-ghost btn-xs"
                        on:click={() => handleEdit(block)}
                        title="편집"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      {#if isInCollection(block.id, $collection)}
                        <button 
                          class="btn btn-ghost btn-xs text-error"
                          on:click={() => handleRemoveFromCollection(block.id)}
                          title="컬렉션에서 제거"
                        >
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path>
                          </svg>
                        </button>
                      {:else}
                        <button 
                          class="btn btn-ghost btn-xs"
                          on:click={() => handleAddToCollection(block)}
                          title="컬렉션에 추가"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                          </svg>
                        </button>
                      {/if}
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
    
    <!-- 무한 스크롤 로딩 표시 -->
    {#if currentLoadIndex < filteredBlocks.length}
      <div class="text-center py-4">
        <button 
          class="btn btn-sm btn-ghost"
          on:click={loadMoreBlocks}
        >
          더 보기 ({currentLoadIndex}/{filteredBlocks.length})
        </button>
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
            <option value="concept">개념</option>
            <option value="passage">지문</option>
            <option value="explanation">해설</option>
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
            <option value="very_easy">매우 쉬움</option>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
            <option value="very_hard">매우 어려움</option>
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
          
          <!-- 배점 -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">배점</span>
            </label>
            <input 
              type="number" 
              class="input input-bordered" 
              bind:value={editingBlock.score}
              placeholder="점수를 입력하세요"
              min="1"
            />
          </div>
        {/if}
        
        <!-- 단원 -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">단원</span>
          </label>
          <input 
            type="text" 
            class="input input-bordered" 
            bind:value={editingBlock.chapter}
            placeholder="단원을 입력하세요 (예: 3단원. 이차함수)"
          />
        </div>
        
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

<!-- 이미지 모달 -->
{#if showImageModal && modalImageData}
  <div class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">이미지 미리보기</h3>
      <div class="flex justify-center">
        <img 
          src={modalImageData} 
          alt="블록 이미지"
          class="max-w-full max-h-[70vh] object-contain"
        />
      </div>
      <div class="modal-action">
        <button class="btn" on:click={() => showImageModal = false}>닫기</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showImageModal = false}>close</button>
    </form>
  </div>
{/if}

<!-- 상세보기 모달 -->
{#if showDetailModal && detailBlock}
  <div class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4 flex items-center gap-2">
        <span class="text-2xl">{getBlockTypeIcon(detailBlock.type)}</span>
        {getBlockTypeLabel(detailBlock.type)} 상세보기
      </h3>
      
      <div class="space-y-4">
        <!-- 기본 정보 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm font-medium mb-1">타입</p>
            <div class="flex items-center gap-2">
              <span>{getBlockTypeLabel(detailBlock.type)}</span>
              {#if detailBlock.subtype}
                <span class="text-sm text-base-content/70">({getQuestionSubtypeLabel(detailBlock.subtype)})</span>
              {/if}
            </div>
          </div>
          
          <div>
            <p class="text-sm font-medium mb-1">난이도</p>
            <div class="badge {getDifficultyBadgeClass(detailBlock.difficulty)}">
              {getDifficultyLabel(detailBlock.difficulty)}
            </div>
          </div>
          
          {#if detailBlock.score}
            <div>
              <p class="text-sm font-medium mb-1">배점</p>
              <p>{detailBlock.score}점</p>
            </div>
          {/if}
          
          {#if detailBlock.chapter}
            <div>
              <p class="text-sm font-medium mb-1">단원</p>
              <p>{detailBlock.chapter}</p>
            </div>
          {/if}
          
          <div>
            <p class="text-sm font-medium mb-1">생성일</p>
            <p>{formatDate(detailBlock.created_at)}</p>
          </div>
          
          {#if detailBlock.material_id}
            <div>
              <p class="text-sm font-medium mb-1">자료 ID</p>
              <p class="text-xs font-mono">{detailBlock.material_id}</p>
            </div>
          {/if}
        </div>
        
        <!-- 이미지 -->
        {#if detailBlock.image_data}
          <div>
            <p class="text-sm font-medium mb-2">이미지</p>
            <img 
              src={detailBlock.image_data} 
              alt="블록 이미지"
              class="max-w-full rounded border border-base-300 cursor-pointer"
              on:click={() => showImage(detailBlock.image_data)}
            />
          </div>
        {/if}
        
        <!-- 내용 -->
        <div>
          <p class="text-sm font-medium mb-2">내용</p>
          <div class="bg-base-200 p-4 rounded whitespace-pre-wrap">
            {detailBlock.content || '(내용 없음)'}
          </div>
        </div>
        
        <!-- 정답 (문항인 경우) -->
        {#if detailBlock.type === 'question' && detailBlock.correct_answer}
          <div>
            <p class="text-sm font-medium mb-2">정답</p>
            <div class="bg-primary/10 p-4 rounded">
              {detailBlock.correct_answer}
            </div>
          </div>
        {/if}
        
        <!-- 선택지 (객관식인 경우) -->
        {#if detailBlock.options && detailBlock.options.length > 0}
          <div>
            <p class="text-sm font-medium mb-2">선택지</p>
            <ol class="list-decimal list-inside space-y-1">
              {#each detailBlock.options as option, i}
                <li class="bg-base-200 p-2 rounded">{option}</li>
              {/each}
            </ol>
          </div>
        {/if}
        
        <!-- 태그 -->
        {#if detailBlock.tags && detailBlock.tags.length > 0}
          <div>
            <p class="text-sm font-medium mb-2">태그</p>
            <div class="flex flex-wrap gap-2">
              {#each detailBlock.tags as tag}
                <div class="badge badge-outline">{tag}</div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- 커스텀 태그 -->
        {#if detailBlock.custom_tags && detailBlock.custom_tags.length > 0}
          <div>
            <p class="text-sm font-medium mb-2">커스텀 태그</p>
            <div class="flex flex-wrap gap-2">
              {#each detailBlock.custom_tags as tag}
                <div class="badge badge-primary">{tag}</div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
      
      <div class="modal-action">
        <button class="btn btn-outline" on:click={() => handleEdit(detailBlock)}>편집</button>
        <button class="btn" on:click={() => showDetailModal = false}>닫기</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showDetailModal = false}>close</button>
    </form>
  </div>
{/if}

<!-- 컬렉션 패널 -->
{#if showCollectionPanel}
  <div class="fixed bottom-0 right-0 w-80 bg-base-100 shadow-2xl border-l border-base-300 z-40">
    <div class="p-4 border-b">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-lg">컬렉션 ({$collection.length})</h3>
        <button 
          class="btn btn-ghost btn-sm btn-circle"
          on:click={() => showCollectionPanel = false}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <div class="p-4 max-h-96 overflow-y-auto">
      {#if $collection.length === 0}
        <div class="text-center py-8 text-base-content/50">
          <p>컬렉션이 비어있습니다</p>
          <p class="text-sm mt-2">문항을 추가해주세요</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each $collection as item}
            <div class="card bg-base-200 p-3">
              <div class="flex items-start gap-2">
                <div class="text-lg">{getBlockTypeIcon(item.type)}</div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium truncate">
                    {getBlockTypeLabel(item.type)}
                    {#if item.subtype}
                      - {getQuestionSubtypeLabel(item.subtype)}
                    {/if}
                  </p>
                  <p class="text-xs text-base-content/70 line-clamp-2">{item.content}</p>
                </div>
                <button 
                  class="btn btn-ghost btn-xs btn-circle"
                  on:click={() => handleRemoveFromCollection(item.id)}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
    
    {#if $collection.length > 0}
      <div class="p-4 border-t space-y-2">
        <button 
          class="btn btn-primary btn-block"
          on:click={handleCreateFromCollection}
        >
          자료 만들기
        </button>
        <button 
          class="btn btn-outline btn-block"
          on:click={clearCollection}
        >
          컬렉션 비우기
        </button>
      </div>
    {/if}
  </div>
{/if}

<!-- 컬렉션 패널 토글 버튼 -->
{#if !showCollectionPanel}
  <button 
    class="fixed bottom-4 right-4 btn btn-circle btn-primary shadow-lg z-40"
    on:click={() => showCollectionPanel = true}
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
    </svg>
    {#if $collection.length > 0}
      <div class="badge badge-sm badge-error absolute -top-1 -right-1">{$collection.length}</div>
    {/if}
  </button>
{/if}