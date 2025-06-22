<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  let projects = [];
  let filteredProjects = [];
  let searchTerm = '';
  let sortBy = 'updated'; // updated, created, name
  let viewMode = 'grid'; // grid, list
  let selectedProjects = new Set();
  
  onMount(() => {
    loadProjects();
  });
  
  function loadProjects() {
    const stored = localStorage.getItem('userProjects');
    if (stored) {
      projects = JSON.parse(stored);
      filterAndSort();
    }
  }
  
  function filterAndSort() {
    // Filter by search term
    let filtered = projects;
    if (searchTerm) {
      filtered = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        case 'created':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    filteredProjects = filtered;
  }
  
  $: {
    filterAndSort();
  }
  
  function toggleSelection(projectId) {
    if (selectedProjects.has(projectId)) {
      selectedProjects.delete(projectId);
    } else {
      selectedProjects.add(projectId);
    }
    selectedProjects = selectedProjects;
  }
  
  function selectAll() {
    if (selectedProjects.size === filteredProjects.length) {
      selectedProjects.clear();
    } else {
      selectedProjects = new Set(filteredProjects.map(p => p.id));
    }
  }
  
  function openProject(project) {
    goto(`/editor?projectId=${project.id}`);
  }
  
  function duplicateProject(project) {
    const newProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (복사본)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const stored = localStorage.getItem('userProjects');
    const allProjects = stored ? JSON.parse(stored) : [];
    allProjects.push(newProject);
    localStorage.setItem('userProjects', JSON.stringify(allProjects));
    
    loadProjects();
  }
  
  function deleteProject(projectId) {
    if (confirm('이 프로젝트를 삭제하시겠습니까?')) {
      const stored = localStorage.getItem('userProjects');
      if (stored) {
        const allProjects = JSON.parse(stored);
        const filtered = allProjects.filter(p => p.id !== projectId);
        localStorage.setItem('userProjects', JSON.stringify(filtered));
        selectedProjects.delete(projectId);
        loadProjects();
      }
    }
  }
  
  function deleteSelected() {
    if (selectedProjects.size === 0) return;
    
    if (confirm(`${selectedProjects.size}개의 프로젝트를 삭제하시겠습니까?`)) {
      const stored = localStorage.getItem('userProjects');
      if (stored) {
        const allProjects = JSON.parse(stored);
        const filtered = allProjects.filter(p => !selectedProjects.has(p.id));
        localStorage.setItem('userProjects', JSON.stringify(filtered));
        selectedProjects.clear();
        loadProjects();
      }
    }
  }
  
  function createNewProject() {
    goto('/create');
  }
</script>

<svelte:head>
  <title>내 프로젝트 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">내 프로젝트</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        <li>내 프로젝트</li>
      </ul>
    </div>
  </div>
  
  <!-- Toolbar -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <!-- Search -->
        <div class="flex-1 w-full">
          <input
            type="text"
            placeholder="프로젝트 검색..."
            class="input input-bordered w-full max-w-md"
            bind:value={searchTerm}
          />
        </div>
        
        <!-- Actions -->
        <div class="flex gap-2 items-center">
          <!-- Sort -->
          <select class="select select-bordered select-sm" bind:value={sortBy}>
            <option value="updated">최근 수정순</option>
            <option value="created">생성일순</option>
            <option value="name">이름순</option>
          </select>
          
          <!-- View Mode -->
          <div class="btn-group">
            <button 
              class="btn btn-sm {viewMode === 'grid' ? 'btn-active' : ''}"
              on:click={() => viewMode = 'grid'}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
              </svg>
            </button>
            <button 
              class="btn btn-sm {viewMode === 'list' ? 'btn-active' : ''}"
              on:click={() => viewMode = 'list'}
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
          
          <!-- New Project -->
          <button class="btn btn-primary btn-sm" on:click={createNewProject}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            새 프로젝트
          </button>
        </div>
      </div>
      
      <!-- Bulk Actions -->
      {#if selectedProjects.size > 0}
        <div class="flex items-center gap-4 mt-4 p-3 bg-base-200 rounded-lg">
          <span class="text-sm font-medium">{selectedProjects.size}개 선택됨</span>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-sm" on:click={deleteSelected}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
              삭제
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Projects -->
  {#if filteredProjects.length > 0}
    {#if viewMode === 'grid'}
      <!-- Grid View -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {#each filteredProjects as project}
          <div class="group relative">
            <!-- Selection checkbox -->
            <div class="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={selectedProjects.has(project.id)}
                on:change={() => toggleSelection(project.id)}
              />
            </div>
            
            <div 
              class="card bg-base-100 shadow hover:shadow-lg transition-all duration-200 cursor-pointer"
              on:click={() => openProject(project)}
            >
              <figure class="h-40 bg-gradient-to-br from-primary/20 to-secondary/20">
                {#if project.thumbnail}
                  <img src={project.thumbnail} alt={project.name} class="w-full h-full object-cover" />
                {:else}
                  <div class="flex items-center justify-center w-full h-full">
                    <svg class="w-16 h-16 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                {/if}
              </figure>
              <div class="card-body p-4">
                <h3 class="font-medium text-sm truncate">{project.name}</h3>
                <p class="text-xs text-base-content/60">
                  수정: {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <!-- Actions dropdown -->
            <div class="dropdown dropdown-end absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div tabindex="0" role="button" class="btn btn-ghost btn-xs btn-circle bg-base-100">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                </svg>
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow">
                <li><button on:click|stopPropagation={() => duplicateProject(project)}>복제</button></li>
                <li><button on:click|stopPropagation={() => deleteProject(project.id)} class="text-error">삭제</button></li>
              </ul>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- List View -->
      <div class="card bg-base-100 shadow">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>
                  <label>
                    <input 
                      type="checkbox" 
                      class="checkbox"
                      checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                      on:change={selectAll}
                    />
                  </label>
                </th>
                <th>이름</th>
                <th>생성일</th>
                <th>수정일</th>
                <th>크기</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {#each filteredProjects as project}
                <tr class="hover">
                  <th>
                    <label>
                      <input 
                        type="checkbox" 
                        class="checkbox"
                        checked={selectedProjects.has(project.id)}
                        on:change={() => toggleSelection(project.id)}
                      />
                    </label>
                  </th>
                  <td>
                    <button 
                      class="font-medium link link-hover"
                      on:click={() => openProject(project)}
                    >
                      {project.name}
                    </button>
                  </td>
                  <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td>{new Date(project.updatedAt).toLocaleDateString()}</td>
                  <td>{project.size || 'A4'}</td>
                  <td>
                    <div class="dropdown dropdown-end">
                      <div tabindex="0" role="button" class="btn btn-ghost btn-xs">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                        </svg>
                      </div>
                      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow">
                        <li><button on:click={() => duplicateProject(project)}>복제</button></li>
                        <li><button on:click={() => deleteProject(project.id)} class="text-error">삭제</button></li>
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
  {:else}
    <!-- Empty State -->
    <div class="card bg-base-100 shadow">
      <div class="card-body text-center py-16">
        <svg class="w-24 h-24 mx-auto text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        <h3 class="text-lg font-medium mb-2">프로젝트가 없습니다</h3>
        <p class="text-base-content/60 mb-4">
          {searchTerm ? '검색 결과가 없습니다.' : '첫 프로젝트를 만들어보세요.'}
        </p>
        {#if !searchTerm}
          <div>
            <button class="btn btn-primary" on:click={createNewProject}>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              새 프로젝트 만들기
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>