<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials, loading, fetchMaterials, deleteMaterial, formatFileSize, getFileTypeIcon, getFileTypeColor } from '$lib/stores/materials.js';
  
  export let type = 'original';
  
  let filteredMaterials = [];
  let searchTerm = '';
  let sortBy = 'created_at';
  let sortOrder = 'desc';
  let viewType = 'grid'; // 'grid' or 'list'
  let selectedSubject = 'all';
  let selectedExtractionStatus = 'all';
  let currentFolder = '/';
  let showFolderView = false;
  let draggedMaterial = null;
  let dropTarget = null;

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
      const matchesSubject = selectedSubject === 'all' || material.subject === selectedSubject;
      const matchesExtractionStatus = selectedExtractionStatus === 'all' || 
        (selectedExtractionStatus === 'extracted' && material.is_extracted) ||
        (selectedExtractionStatus === 'not_extracted' && !material.is_extracted);
      const matchesFolder = !showFolderView || 
        (material.folder_path && material.folder_path.startsWith(currentFolder));
      
      return matchesType && matchesSearch && matchesSubject && matchesExtractionStatus && matchesFolder;
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

  // 폴더 구조 가져오기
  $: folders = getFoldersFromMaterials($materials, type);
  $: subjects = getUniqueSubjects($materials, type);

  function getFoldersFromMaterials(materials, type) {
    const folderSet = new Set();
    materials
      .filter(m => m.type === type && m.folder_path)
      .forEach(m => {
        const parts = m.folder_path.split('/').filter(Boolean);
        let currentPath = '';
        parts.forEach(part => {
          currentPath += '/' + part;
          folderSet.add(currentPath);
        });
      });
    return Array.from(folderSet).sort();
  }

  function getUniqueSubjects(materials, type) {
    const subjectSet = new Set();
    materials
      .filter(m => m.type === type && m.subject)
      .forEach(m => subjectSet.add(m.subject));
    return Array.from(subjectSet).sort();
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

  // 드래그앤드롭 함수들
  function handleDragStart(e, material) {
    draggedMaterial = material;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    e.currentTarget.style.opacity = '0.5';
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedMaterial = null;
    dropTarget = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  function handleDragEnter(e, material) {
    if (draggedMaterial && draggedMaterial.id !== material.id) {
      dropTarget = material;
      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
    }
  }

  function handleDragLeave(e) {
    e.currentTarget.style.backgroundColor = '';
  }

  function handleDrop(e, targetMaterial) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    
    if (draggedMaterial && targetMaterial && draggedMaterial.id !== targetMaterial.id) {
      // 같은 폴더로 이동 시뮬레이션
      if (targetMaterial.folder_path && draggedMaterial.folder_path !== targetMaterial.folder_path) {
        console.log(`Moving ${draggedMaterial.title} to ${targetMaterial.folder_path}`);
        // 실제 구현에서는 API 호출로 폴더 이동
        alert(`"${draggedMaterial.title}"을(를) "${targetMaterial.folder_path}" 폴더로 이동했습니다.`);
      }
    }
    
    draggedMaterial = null;
    dropTarget = null;
    return false;
  }

  function handleFolderDrop(e, folderPath) {
    e.preventDefault();
    e.currentTarget.style.backgroundColor = '';
    
    if (draggedMaterial && draggedMaterial.folder_path !== folderPath) {
      console.log(`Moving ${draggedMaterial.title} to ${folderPath}`);
      // 실제 구현에서는 API 호출로 폴더 이동
      alert(`"${draggedMaterial.title}"을(를) "${folderPath}" 폴더로 이동했습니다.`);
    }
    
    draggedMaterial = null;
    dropTarget = null;
    return false;
  }

  onMount(() => {
    if ($user?.id) {
      loadMaterials();
    }
  });
</script>

<div class="space-y-4">
  <!-- 필터 및 검색 -->
  <div class="bg-base-100 rounded-lg shadow p-4 space-y-4">
    <!-- 상단: 검색 및 폴더 토글 -->
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
      
      <!-- 폴더 보기 토글 -->
      <div class="flex items-center gap-3">
        <label class="label cursor-pointer">
          <span class="label-text mr-2">폴더 보기</span>
          <input type="checkbox" class="toggle toggle-primary" bind:checked={showFolderView} />
        </label>
      </div>
    </div>
    
    <!-- 하단: 필터들 -->
    <div class="flex flex-wrap gap-3 items-center">
      <!-- 과목 필터 -->
      <select class="select select-bordered select-sm" bind:value={selectedSubject}>
        <option value="all">모든 과목</option>
        {#each subjects as subject}
          <option value={subject}>{subject}</option>
        {/each}
      </select>
      
      <!-- 추출 상태 필터 -->
      <select class="select select-bordered select-sm" bind:value={selectedExtractionStatus}>
        <option value="all">추출 상태</option>
        <option value="extracted">추출 완료</option>
        <option value="not_extracted">추출 전</option>
      </select>
      
      <!-- 폴더 선택 (폴더 보기 모드일 때만) -->
      {#if showFolderView}
        <select class="select select-bordered select-sm" bind:value={currentFolder}>
          <option value="/">전체 폴더</option>
          {#each folders as folder}
            <option value={folder}>{folder}</option>
          {/each}
        </select>
      {/if}
    </div>
    
    <!-- 폴더 드롭 존 (폴더 보기 모드일 때만) -->
    {#if showFolderView && folders.length > 0}
      <div class="border-t pt-3">
        <p class="text-sm font-medium mb-2">폴더로 드래그하여 이동:</p>
        <div class="flex flex-wrap gap-2">
          {#each folders as folder}
            <div 
              class="badge badge-outline badge-lg cursor-pointer hover:badge-primary transition-colors p-3"
              on:dragover={handleDragOver}
              on:dragenter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
              on:dragleave={(e) => e.currentTarget.style.backgroundColor = ''}
              on:drop={(e) => handleFolderDrop(e, folder)}
            >
              📁 {folder}
            </div>
          {/each}
        </div>
      </div>
    {/if}
    </div>
  </div>
  
  <!-- 뷰 컨트롤 -->
  <div class="flex justify-between items-center">
    
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
          <div 
            class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-move"
            draggable="true"
            on:dragstart={(e) => handleDragStart(e, material)}
            on:dragend={handleDragEnd}
            on:dragover={handleDragOver}
            on:dragenter={(e) => handleDragEnter(e, material)}
            on:dragleave={handleDragLeave}
            on:drop={(e) => handleDrop(e, material)}
          >
            <div class="card-body">
              <div class="flex items-start justify-between mb-2">
                <div class="relative">
                  <div class="text-2xl {getFileTypeColor(material.file_type)}">{getFileTypeIcon(material.file_type)}</div>
                  {#if material.is_extracted}
                    <div class="absolute -top-1 -right-1 w-4 h-4 bg-success text-success-content rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  {/if}
                </div>
                <div class="flex flex-col items-end gap-1">
                  <!-- 추출 상태 배지 -->
                  {#if material.is_extracted}
                    <div class="badge badge-success badge-xs">
                      추출완료 ({material.extracted_count}개)
                    </div>
                  {:else}
                    <div class="badge badge-ghost badge-xs">추출 전</div>
                  {/if}
                  
                  <!-- 드롭다운 메뉴 -->
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
              
              <!-- 폴더 경로 및 과목 -->
              <div class="flex flex-wrap gap-1 mb-2">
                {#if material.subject}
                  <span class="badge badge-primary badge-xs">{material.subject}</span>
                {/if}
                {#if material.folder_path && material.folder_path !== '/'}
                  <span class="badge badge-outline badge-xs">📁 {material.folder_path}</span>
                {/if}
              </div>
              
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
                {#if material.is_extracted && material.extraction_date}
                  <p class="text-success">추출일: {formatDate(material.extraction_date)}</p>
                {/if}
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
                <th>과목/폴더</th>
                <th>추출상태</th>
                <th>크기</th>
                <th>페이지</th>
                <th>생성일</th>
                <th class="text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredMaterials as material}
                <tr 
                  class="hover:bg-base-200 cursor-move"
                  draggable="true"
                  on:dragstart={(e) => handleDragStart(e, material)}
                  on:dragend={handleDragEnd}
                  on:dragover={handleDragOver}
                  on:dragenter={(e) => handleDragEnter(e, material)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(e, material)}
                >
                  <td>
                    <div class="relative">
                      <div class="text-2xl {getFileTypeColor(material.file_type)}">{getFileTypeIcon(material.file_type)}</div>
                      {#if material.is_extracted}
                        <div class="absolute -top-1 -right-1 w-3 h-3 bg-success text-success-content rounded-full flex items-center justify-center text-xs">
                          ✓
                        </div>
                      {/if}
                    </div>
                  </td>
                  <td>
                    <div class="font-medium">{material.title}</div>
                    <div class="text-xs text-base-content/70">
                      {material.file_type ? material.file_type.split('/')[1].toUpperCase() : '-'}
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-col gap-1">
                      {#if material.subject}
                        <span class="badge badge-primary badge-xs">{material.subject}</span>
                      {/if}
                      {#if material.folder_path && material.folder_path !== '/'}
                        <span class="badge badge-outline badge-xs text-xs">📁 {material.folder_path}</span>
                      {/if}
                    </div>
                  </td>
                  <td>
                    {#if material.is_extracted}
                      <div class="badge badge-success badge-sm">
                        추출완료 ({material.extracted_count}개)
                      </div>
                    {:else}
                      <div class="badge badge-ghost badge-sm">추출 전</div>
                    {/if}
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
                    <div class="text-sm text-base-content/70">
                      <div>{formatDate(material.created_at)}</div>
                      {#if material.is_extracted && material.extraction_date}
                        <div class="text-success text-xs">추출: {formatDate(material.extraction_date)}</div>
                      {/if}
                    </div>
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