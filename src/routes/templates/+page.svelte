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
  
  // Load templates on mount
  onMount(() => {
    allTemplates = templates.getAllTemplates();
    
    // Check if coming from question bank
    fromQuestionBank = $page.url.searchParams.get('from') === 'question-bank';
    if (fromQuestionBank) {
      const stored = localStorage.getItem('selectedQuestions');
      if (stored) {
        selectedQuestions = JSON.parse(stored);
      }
    }
  });
  
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
  
  
  function useTemplate(template) {
    // 템플릿을 사용하여 자료 생성 페이지로 이동
    if (fromQuestionBank) {
      goto(`/create-material?template=${template.id}&from=question-bank`);
    } else {
      goto(`/create-material?template=${template.id}`);
    }
  }
  
  function createFromTemplate(template) {
    // 템플릿으로부터 새 자료 만들기
    if (fromQuestionBank) {
      goto(`/create-material?template=${template.id}&from=question-bank`);
    } else {
      goto(`/create-material?template=${template.id}`);
    }
  }
  
  function previewTemplate(template) {
    // 템플릿 미리보기
    console.log('템플릿 미리보기:', template);
    alert(`${template.name} 미리보기 기능은 곧 추가될 예정입니다.`);
  }
  
  function duplicateTemplate(template) {
    // 템플릿 복제
    console.log('템플릿 복제:', template);
    alert(`${template.name} 복제 기능은 곧 추가될 예정입니다.`);
  }
</script>

<svelte:head>
  <title>템플릿 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">템플릿</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        {#if fromQuestionBank}
          <li><a href="/question-bank">문제 은행</a></li>
        {/if}
        <li>템플릿</li>
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

  <!-- 필터 및 검색 -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div class="flex flex-col lg:flex-row gap-4 items-center">
        <!-- 검색 -->
        <div class="flex-1 w-full max-w-md">
          <input
            type="text"
            placeholder="템플릿 검색..."
            class="input input-bordered w-full"
            bind:value={searchTerm}
          />
        </div>
        
        <!-- 필터 -->
        <div class="flex gap-3 items-center">
          <select class="select select-bordered select-sm" bind:value={selectedCategory}>
            <option value="all">모든 카테고리</option>
            <option value="exam">시험지</option>
            <option value="worksheet">학습지</option>
            <option value="quiz">퀴즈</option>
            <option value="homework">과제</option>
            <option value="assessment">평가</option>
          </select>
          
          <select class="select select-bordered select-sm" bind:value={selectedDifficulty}>
            <option value="all">모든 난이도</option>
            <option value="easy">쉬움</option>
            <option value="medium">보통</option>
            <option value="hard">어려움</option>
          </select>
          
          <div class="flex gap-2">
            <label class="form-control">
              <label class="label cursor-pointer">
                <span class="label-text mr-2">내 템플릿만</span>
                <input type="checkbox" bind:checked={showCustomOnly} class="checkbox checkbox-sm" />
              </label>
            </label>
            <button class="btn btn-primary">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              새 템플릿
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 템플릿 목록 -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {#each filteredTemplates as template}
      <div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-200 hover:-translate-y-1">
        <!-- 미리보기 이미지 -->
        <div class="h-48 bg-gradient-to-br from-primary/20 to-secondary/20 relative overflow-hidden">
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-6xl opacity-30">
              {#if template.category === 'exam'}📄
              {:else if template.category === 'worksheet'}📋
              {:else if template.category === 'quiz'}❓
              {:else if template.category === 'homework'}📚
              {:else if template.category === 'assessment'}📊
              {/if}
            </div>
          </div>
          
          <!-- 카테고리 배지 -->
          <div class="absolute top-3 left-3">
            <div class="badge badge-primary">{getCategoryLabel(template.category)}</div>
          </div>
          
          <!-- 난이도 배지 -->
          <div class="absolute top-3 right-3">
            <div class="badge {getDifficultyColor(template.difficulty)}">
              {getDifficultyLabel(template.difficulty)}
            </div>
          </div>
        </div>
        
        <div class="card-body">
          <h2 class="card-title">{template.name}</h2>
          <p class="text-sm text-base-content/70 mb-3">{template.description}</p>
          
          <!-- 예상 소요 시간 -->
          <div class="flex items-center gap-2 text-sm text-base-content/70 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>예상 소요시간: {template.estimatedTime}</span>
          </div>
          
          <!-- 주요 기능 -->
          <div class="mb-4">
            <h4 class="font-medium text-sm mb-2">주요 기능</h4>
            <div class="space-y-1">
              {#each template.features.slice(0, 3) as feature}
                <div class="flex items-center gap-2 text-xs">
                  <span class="w-1 h-1 bg-primary rounded-full"></span>
                  <span>{feature}</span>
                </div>
              {/each}
              {#if template.features.length > 3}
                <div class="text-xs text-base-content/70">
                  +{template.features.length - 3}개 더
                </div>
              {/if}
            </div>
          </div>
          
          <!-- 태그 -->
          <div class="flex flex-wrap gap-1 mb-4">
            {#each template.tags.slice(0, 3) as tag}
              <span class="badge badge-ghost badge-xs">{tag}</span>
            {/each}
          </div>
          
          <!-- 액션 버튼 -->
          <div class="card-actions justify-end">
            <div class="dropdown dropdown-top dropdown-end">
              <div tabindex="0" role="button" class="btn btn-ghost btn-sm">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                </svg>
              </div>
              <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                <li><button on:click={() => previewTemplate(template)}>미리보기</button></li>
                <li><button on:click={() => duplicateTemplate(template)}>복제</button></li>
                <li><button>즐겨찾기</button></li>
              </ul>
            </div>
            <button 
              class="btn btn-primary btn-sm"
              on:click={() => createFromTemplate(template)}
            >
              자료 만들기
            </button>
          </div>
        </div>
      </div>
    {:else}
      <!-- 검색 결과 없음 -->
      <div class="col-span-full text-center py-12">
        <div class="text-4xl mb-4">🔍</div>
        <h3 class="text-lg font-medium mb-2">검색 결과가 없습니다</h3>
        <p class="text-base-content/70 mb-4">
          다른 검색어나 필터를 시도해보세요
        </p>
        <button 
          class="btn btn-outline"
          on:click={() => {
            searchTerm = '';
            selectedCategory = 'all';
            selectedDifficulty = 'all';
          }}
        >
          필터 초기화
        </button>
      </div>
    {/each}
  </div>

  <!-- 사용자 정의 템플릿 섹션 -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div class="flex items-center justify-between mb-4">
        <h2 class="card-title">내 템플릿</h2>
        <button class="btn btn-outline btn-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          새 템플릿 만들기
        </button>
      </div>
      
      <div class="text-center py-8">
        <div class="text-4xl mb-4">📁</div>
        <h3 class="text-lg font-medium mb-2">사용자 정의 템플릿이 없습니다</h3>
        <p class="text-base-content/70 mb-4">
          자료를 만들고 템플릿으로 저장하여 재사용해보세요
        </p>
        <a href="/create-material" class="btn btn-primary">자료 만들기</a>
      </div>
    </div>
  </div>
</div>