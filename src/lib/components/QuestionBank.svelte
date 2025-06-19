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
  let filterTypes = [];
  let filterDifficulties = [];
  let filterSubjects = [];
  let selectedMaterial = 'all';
  let viewType = 'grid';

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
      const matchesType = filterTypes.length === 0 || filterTypes.includes(block.type);
      const matchesDifficulty = filterDifficulties.length === 0 || filterDifficulties.includes(block.difficulty);
      const material = $materials.find(m => m.id === block.material_id);
      const matchesSubject = filterSubjects.length === 0 || (material && filterSubjects.includes(material.subject));
      const matchesMaterial = selectedMaterial === 'all' || block.material_id === selectedMaterial;
      
      return matchesSearch && matchesType && matchesDifficulty && matchesSubject && matchesMaterial;
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

  // handleUpload 제거

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

  function getMaterialSubject(materialId) {
    const material = $materials.find(m => m.id === materialId);
    return material ? material.subject : '기타';
  }

  function getUniqueSubjects() {
    const subjects = new Set();
    $blocks.forEach(block => {
      const material = $materials.find(m => m.id === block.material_id);
      if (material && material.subject) {
        subjects.add(material.subject);
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
    filterArray = [...filterArray];
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
  <!-- 상단 검색 및 뷰 컨트롤 -->
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
      <button class="btn btn-success" on:click={handleCreate}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        문항 만들기
      </button>
    </div>
  </div>

  <!-- 필터 패널 -->
  <div class="bg-base-100 rounded-lg shadow p-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 과목 필터 -->
      <div>
        <h4 class="font-medium mb-2 text-sm">과목</h4>
        <div class="space-y-1 max-h-32 overflow-y-auto">
          {#each getUniqueSubjects() as subject}
            <label class="label cursor-pointer justify-start gap-2 py-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={filterSubjects.includes(subject)}
                on:change={() => toggleFilter(filterSubjects, subject)}
              />
              <span class="label-text text-sm">{subject}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- 문항 타입 필터 -->
      <div>
        <h4 class="font-medium mb-2 text-sm">문항 타입</h4>
        <div class="space-y-1">
          {#each [
            { value: 'multiple_choice', label: '객관식' },
            { value: 'short_answer', label: '단답형' },
            { value: 'essay', label: '서술형' },
            { value: 'true_false', label: 'O/X' }
          ] as type}
            <label class="label cursor-pointer justify-start gap-2 py-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={filterTypes.includes(type.value)}
                on:change={() => toggleFilter(filterTypes, type.value)}
              />
              <span class="label-text text-sm">{type.label}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- 난이도 필터 -->
      <div>
        <h4 class="font-medium mb-2 text-sm">난이도</h4>
        <div class="space-y-1">
          {#each [
            { value: 'easy', label: '쉬움' },
            { value: 'medium', label: '보통' },
            { value: 'hard', label: '어려움' }
          ] as difficulty}
            <label class="label cursor-pointer justify-start gap-2 py-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={filterDifficulties.includes(difficulty.value)}
                on:change={() => toggleFilter(filterDifficulties, difficulty.value)}
              />
              <span class="label-text text-sm">{difficulty.label}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- 자료 필터 -->
      <div>
        <h4 class="font-medium mb-2 text-sm">자료</h4>
        <select class="select select-bordered select-sm w-full" bind:value={selectedMaterial}>
          <option value="all">모든 자료</option>
          {#each $materials as material}
            <option value={material.id}>{material.title}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
  
  <!-- 로딩 상태 -->
  {#if $loading}
    <div class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>
  {:else}
    <!-- 문항 목록 -->
    {#if viewType === 'grid'}
      <!-- 카드 뷰 -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {#each filteredBlocks as block}
          <div class="card bg-base-100 shadow hover:shadow-lg transition-shadow compact">
            <div class="card-body p-3">
              <div class="flex items-start justify-between mb-2">
                <div class="text-lg">{getQuestionTypeIcon(block.type)}</div>
                <div class="dropdown dropdown-end">
                  <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                    </svg>
                  </div>
                  <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow">
                    <li><button on:click={() => handleEdit(block)}>편집</button></li>
                    <li><button on:click={() => handleDelete(block)} class="text-error">삭제</button></li>
                  </ul>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-1 mb-2">
                <div class="badge badge-primary badge-xs">
                  {getQuestionTypeLabel(block.type)}
                </div>
                <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-xs">
                  {getDifficultyLabel(block.difficulty)}
                </div>
                <div class="badge badge-outline badge-xs">
                  {getMaterialSubject(block.material_id)}
                </div>
              </div>
              
              <p class="text-xs text-base-content/70 line-clamp-2 mb-2">{block.question}</p>
              
              {#if block.correct_answer}
                <p class="text-xs mb-2">
                  <span class="font-medium">정답:</span> 
                  <span class="text-primary truncate">{block.correct_answer}</span>
                </p>
              {/if}
              
              <div class="text-xs text-base-content/50 mb-2">
                <p class="truncate">{getMaterialTitle(block.material_id)}</p>
                <p>{formatDate(block.created_at)}</p>
              </div>
              
              <div class="card-actions justify-end">
                <button 
                  class="btn btn-primary btn-xs" 
                  on:click={() => handleEdit(block)}
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
          <table class="table table-sm">
            <thead>
              <tr>
                <th>문항</th>
                <th>타입</th>
                <th>난이도</th>
                <th>과목</th>
                <th>자료</th>
                <th>정답</th>
                <th>생성일</th>
                <th class="text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredBlocks as block}
                <tr class="hover">
                  <td>
                    <div class="font-medium text-sm max-w-md truncate">{block.question}</div>
                    {#if block.tags && block.tags.length > 0}
                      <div class="flex flex-wrap gap-1 mt-1">
                        {#each block.tags.slice(0, 2) as tag}
                          <div class="badge badge-ghost badge-xs">{tag}</div>
                        {/each}
                        {#if block.tags.length > 2}
                          <div class="badge badge-ghost badge-xs">+{block.tags.length - 2}</div>
                        {/if}
                      </div>
                    {/if}
                  </td>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="text-lg">{getQuestionTypeIcon(block.type)}</span>
                      <span class="text-sm">{getQuestionTypeLabel(block.type)}</span>
                    </div>
                  </td>
                  <td>
                    <div class="badge {getDifficultyBadgeClass(block.difficulty)} badge-sm">
                      {getDifficultyLabel(block.difficulty)}
                    </div>
                  </td>
                  <td>
                    <div class="badge badge-outline badge-sm">
                      {getMaterialSubject(block.material_id)}
                    </div>
                  </td>
                  <td>
                    <div class="text-sm max-w-32 truncate">{getMaterialTitle(block.material_id)}</div>
                    {#if block.page_number}
                      <div class="text-xs text-base-content/70">{block.page_number}페이지</div>
                    {/if}
                  </td>
                  <td>
                    <div class="text-sm max-w-24 truncate">
                      {block.correct_answer || '-'}
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
        <h3 class="text-lg font-medium mb-2">문항이 없습니다</h3>
        <p class="text-base-content/70 mb-4">
          자료를 업로드하고 문항을 추출하거나 직접 만들어보세요
        </p>
        <div class="flex gap-2 justify-center">
          <button class="btn btn-outline" on:click={handleCreate}>문항 만들기</button>
        </div>
      </div>
    {/if}
  {/if}
</div>