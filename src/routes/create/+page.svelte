<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { templates, getCategoryLabel, getDifficultyLabel, getDifficultyColor } from '$lib/stores/templates.js';
  
  let allTemplates = [];
  let filteredTemplates = [];
  let selectedCategory = 'all';
  let selectedDifficulty = 'all';
  let searchTerm = '';
  let showCustomOnly = false;
  let fromQuestionBank = false;
  let selectedQuestions = [];
  
  // Dashboard data
  let recentProjects = [];
  let popularTemplates = [];
  
  // Modal states
  let showNewProjectModal = false;
  let showTemplateSelector = false;
  let newProjectData = {
    name: '',
    size: 'A4',
    orientation: 'portrait',
    pageCount: 1
  };
  
  // Load templates on mount
  onMount(() => {
    allTemplates = templates.getAllTemplates();
    
    // Load popular templates (top 4)
    popularTemplates = allTemplates.slice(0, 4);
    
    // Load recent projects from localStorage
    loadRecentProjects();
    
    // Check if coming from question bank
    fromQuestionBank = $page.url.searchParams.get('from') === 'question-bank';
    if (fromQuestionBank) {
      const stored = localStorage.getItem('selectedQuestions');
      if (stored) {
        selectedQuestions = JSON.parse(stored);
      }
    }
  });
  
  function loadRecentProjects() {
    // TODO: Load recent materials from Supabase
    recentProjects = [];
  }
  
  // Subscribe to template changes
  $: {
    allTemplates = $templates ? [...$templates.templates, ...$templates.customTemplates] : [];
  }
  
  // 필터링 적용
  $: {
    filteredTemplates = templates.filterTemplates({
      category: selectedCategory,
      difficulty: selectedDifficulty,
      search: searchTerm
    }).filter(template => {
      if (showCustomOnly) {
        return template.isCustom;
      }
      return true;
    });
  }
  
  
  function createBlankProject() {
    // Navigate to create-material with blank template
    goto('/create-material?template=blank');
  }
  
  function createFromTemplate(template) {
    // Navigate to create-material with template
    goto(`/create-material?template=${template.id}`);
  }
  
  function createNewProject() {
    // Reset and close modal
    showNewProjectModal = false;
    newProjectData = {
      name: '',
      size: 'A4',
      orientation: 'portrait',
      pageCount: 1
    };
    
    // Navigate to create-material with blank template
    goto('/create-material?template=blank');
  }
  
  
  function openProject(project) {
    // For now, redirect to my-materials page
    goto('/my-materials');
  }
  
  function duplicateProject(project) {
    const newProject = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (복사본)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveProject(newProject);
    loadRecentProjects();
  }
  
  function deleteProject(projectId) {
    if (confirm('이 프로젝트를 삭제하시겠습니까?')) {
      const stored = localStorage.getItem('userProjects');
      if (stored) {
        const projects = JSON.parse(stored);
        const filtered = projects.filter(p => p.id !== projectId);
        localStorage.setItem('userProjects', JSON.stringify(filtered));
        loadRecentProjects();
      }
    }
  }
  
  function openTemplateSelector() {
    showTemplateSelector = true;
  }
  
  function openQuestionBankFlow() {
    goto('/question-bank?flow=create');
  }
  
  function openAIGenerator() {
    alert('AI 자료 생성 기능은 곧 추가될 예정입니다.');
  }
</script>

<svelte:head>
  <title>자료 만들기 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">자료 만들기</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        {#if fromQuestionBank}
          <li><a href="/question-bank">문제 은행</a></li>
        {/if}
        <li>자료 만들기</li>
      </ul>
    </div>
  </div>
  
  {#if fromQuestionBank && selectedQuestions.length > 0}
    <div class="alert alert-info">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{selectedQuestions.length}개의 문항이 선택되었습니다. 템플릿을 선택하여 자료를 만들어보세요.</span>
    </div>
  {/if}
  
  <!-- 새로 만들기 섹션 -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title mb-4">새로 만들기</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button 
          class="btn btn-lg btn-outline h-auto py-8 hover:border-primary hover:bg-primary/10"
          on:click={createBlankProject}
        >
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div>
              <p class="font-semibold">빈 캔버스</p>
              <p class="text-xs text-base-content/60">처음부터 시작</p>
            </div>
          </div>
        </button>
        
        <button 
          class="btn btn-lg btn-outline h-auto py-8 hover:border-secondary hover:bg-secondary/10"
          on:click={openTemplateSelector}
        >
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
              </svg>
            </div>
            <div>
              <p class="font-semibold">템플릿에서</p>
              <p class="text-xs text-base-content/60">템플릿 선택</p>
            </div>
          </div>
        </button>
        
        <button 
          class="btn btn-lg btn-outline h-auto py-8 hover:border-accent hover:bg-accent/10"
          on:click={openQuestionBankFlow}
        >
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
            <div>
              <p class="font-semibold">문제은행에서</p>
              <p class="text-xs text-base-content/60">문제 선택</p>
            </div>
          </div>
        </button>
        
        <button 
          class="btn btn-lg btn-outline h-auto py-8 hover:border-warning hover:bg-warning/10"
          on:click={openAIGenerator}
        >
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
              <svg class="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div>
              <p class="font-semibold">AI 생성</p>
              <p class="text-xs text-base-content/60">자동 생성</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
  
  <!-- 최근 프로젝트 섹션 -->
  {#if recentProjects.length > 0}
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title">최근 프로젝트</h2>
          <a href="/projects" class="btn btn-ghost btn-sm">모두 보기</a>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {#each recentProjects as project}
            <div class="group relative">
              <div 
                class="card bg-base-200 cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                on:click={() => openProject(project)}
              >
                <figure class="h-32 bg-gradient-to-br from-primary/20 to-secondary/20">
                  {#if project.thumbnail}
                    <img src={project.thumbnail} alt={project.name} class="w-full h-full object-cover" />
                  {:else}
                    <div class="flex items-center justify-center w-full h-full">
                      <svg class="w-12 h-12 text-base-content/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                      </svg>
                    </div>
                  {/if}
                </figure>
                <div class="card-body p-3">
                  <h3 class="text-sm font-medium truncate">{project.name}</h3>
                  <p class="text-xs text-base-content/60">{new Date(project.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <!-- Project actions -->
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
      </div>
    </div>
  {:else}
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title mb-4">최근 프로젝트</h2>
        <div class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-base-content/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <p class="text-base-content/60 mb-4">아직 프로젝트가 없습니다</p>
          <p class="text-sm text-base-content/40">위의 옵션 중 하나를 선택하여 첫 프로젝트를 만들어보세요</p>
        </div>
      </div>
    </div>
  {/if}
  
  <!-- 추천 템플릿 섹션 -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h2 class="card-title">추천 템플릿</h2>
        <button class="btn btn-ghost btn-sm" on:click={openTemplateSelector}>더 보기</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each popularTemplates as template}
          <div 
            class="card bg-base-200 hover:shadow-lg transition-all duration-200 cursor-pointer hover:-translate-y-1"
            on:click={() => createFromTemplate(template)}
          >
            <figure class="h-32 bg-gradient-to-br from-primary/10 to-secondary/10">
              <div class="flex items-center justify-center w-full h-full">
                <div class="text-4xl">
                  {#if template.category === 'exam'}📄
                  {:else if template.category === 'worksheet'}📋
                  {:else if template.category === 'quiz'}❓
                  {:else if template.category === 'homework'}📚
                  {:else if template.category === 'assessment'}📊
                  {:else if template.category === 'concept'}📖
                  {:else if template.category === 'presentation'}🖼️
                  {:else if template.category === 'poster'}📌
                  {:else if template.category === 'flashcard'}🎴
                  {/if}
                </div>
              </div>
            </figure>
            <div class="card-body p-4">
              <div class="flex items-start justify-between">
                <h3 class="font-bold text-sm">{template.name}</h3>
                <div class="badge badge-sm {getDifficultyColor(template.difficulty)}">
                  {getDifficultyLabel(template.difficulty)}
                </div>
              </div>
              <p class="text-xs text-base-content/70 line-clamp-2">{template.description}</p>
              <div class="flex items-center justify-between mt-2">
                <span class="text-xs text-base-content/60">{template.estimatedTime}</span>
                <span class="text-xs badge badge-outline">{getCategoryLabel(template.category)}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>


<!-- New Project Modal -->
{#if showNewProjectModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">새 프로젝트 만들기</h3>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">프로젝트 이름</span>
        </label>
        <input 
          type="text" 
          class="input input-bordered" 
          placeholder="예: 2학기 중간고사 시험지"
          bind:value={newProjectData.name}
        />
      </div>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">문서 크기</span>
        </label>
        <select class="select select-bordered" bind:value={newProjectData.size}>
          <option value="A4">A4 (210 × 297mm)</option>
          <option value="A3">A3 (297 × 420mm)</option>
          <option value="B4">B4 (257 × 364mm)</option>
          <option value="Letter">Letter (216 × 279mm)</option>
        </select>
      </div>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">방향</span>
        </label>
        <div class="flex gap-4">
          <label class="label cursor-pointer flex-1">
            <input type="radio" name="orientation" class="radio" value="portrait" bind:group={newProjectData.orientation} />
            <span class="label-text ml-2">세로</span>
          </label>
          <label class="label cursor-pointer flex-1">
            <input type="radio" name="orientation" class="radio" value="landscape" bind:group={newProjectData.orientation} />
            <span class="label-text ml-2">가로</span>
          </label>
        </div>
      </div>
      
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">페이지 수</span>
        </label>
        <input 
          type="number" 
          class="input input-bordered" 
          min="1" 
          max="100"
          bind:value={newProjectData.pageCount}
        />
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showNewProjectModal = false}>취소</button>
        <button class="btn btn-primary" on:click={createNewProject}>프로젝트 만들기</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showNewProjectModal = false}>close</button>
    </form>
  </div>
{/if}

<!-- Template Selector Modal -->
{#if showTemplateSelector}
  <div class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">템플릿 선택</h3>
      
      <!-- Category Tabs -->
      <div class="tabs tabs-boxed mb-4">
        <a class="tab {selectedCategory === 'all' ? 'tab-active' : ''}" on:click={() => selectedCategory = 'all'}>전체</a>
        <a class="tab {selectedCategory === 'exam' ? 'tab-active' : ''}" on:click={() => selectedCategory = 'exam'}>시험지</a>
        <a class="tab {selectedCategory === 'worksheet' ? 'tab-active' : ''}" on:click={() => selectedCategory = 'worksheet'}>학습지</a>
        <a class="tab {selectedCategory === 'quiz' ? 'tab-active' : ''}" on:click={() => selectedCategory = 'quiz'}>퀴즈</a>
        <a class="tab {selectedCategory === 'presentation' ? 'tab-active' : ''}" on:click={() => selectedCategory = 'presentation'}>발표</a>
      </div>
      
      <!-- Search -->
      <div class="form-control mb-4">
        <input 
          type="text" 
          placeholder="템플릿 검색..." 
          class="input input-bordered" 
          bind:value={searchTerm}
        />
      </div>
      
      <!-- Template Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {#each filteredTemplates as template}
          <div 
            class="card bg-base-200 cursor-pointer hover:shadow-lg transition-all hover:ring-2 hover:ring-primary"
            on:click={() => {
              createFromTemplate(template);
              showTemplateSelector = false;
            }}
          >
            <figure class="h-24 bg-gradient-to-br from-primary/10 to-secondary/10">
              <div class="text-3xl">
                {#if template.category === 'exam'}📄
                {:else if template.category === 'worksheet'}📋
                {:else if template.category === 'quiz'}❓
                {:else if template.category === 'homework'}📚
                {:else if template.category === 'assessment'}📊
                {:else if template.category === 'concept'}📖
                {:else if template.category === 'presentation'}🖼️
                {:else if template.category === 'poster'}📌
                {:else if template.category === 'flashcard'}🎴
                {/if}
              </div>
            </figure>
            <div class="card-body p-3">
              <h4 class="font-medium text-sm">{template.name}</h4>
              <p class="text-xs text-base-content/60 line-clamp-2">{template.description}</p>
              <div class="flex justify-between items-center mt-2">
                <span class="badge badge-sm">{getCategoryLabel(template.category)}</span>
                <span class="text-xs text-warning">★ 4.5</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showTemplateSelector = false}>닫기</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showTemplateSelector = false}>close</button>
    </form>
  </div>
{/if}