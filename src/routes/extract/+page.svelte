<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials, formatFileSize, getFileTypeIcon } from '$lib/stores/materials.js';
  import { addBlock } from '$lib/stores/blocks.js';
  import { goto } from '$app/navigation';
  
  let selectedMaterial = null;
  let currentPage = 1;
  let totalPages = 10;
  let extractionMode = 'manual';
  let selectedBlocks = [];
  let nextBlockId = 1;
  let extractionStep = 'select-material';
  
  // 드래그 상태
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let dragEnd = { x: 0, y: 0 };
  let selectedBlockIds = [];
  
  // 블록 타입
  const blockTypes = [
    { value: 'question', label: '문제', icon: '❓', color: 'border-primary bg-primary/10' },
    { value: 'passage', label: '지문', icon: '📜', color: 'border-secondary bg-secondary/10' },
    { value: 'concept', label: '개념', icon: '💡', color: 'border-accent bg-accent/10' },
    { value: 'explanation', label: '해설', icon: '📝', color: 'border-info bg-info/10' }
  ];
  
  // 문항 형식
  const questionFormats = [
    { value: 'ox', label: 'O/X' },
    { value: 'multiple_choice', label: '객관식' },
    { value: 'single_choice', label: '단일 선택' },
    { value: 'short_answer', label: '주관식' },
    { value: 'essay', label: '서술형' }
  ];
  
  // 난이도 태그
  const difficultyTags = [
    { value: 'low', label: '난이도 낮음', color: 'badge-success' },
    { value: 'medium', label: '난이도 중간', color: 'badge-warning' },
    { value: 'high', label: '난이도 높음', color: 'badge-error' }
  ];
  
  onMount(() => {
    if (browser && $user?.id) {
      fetchMaterials($user.id, 'original');
    }
  });
  
  function selectMaterial(material) {
    selectedMaterial = material;
    extractionStep = 'extract-blocks';
    totalPages = material.pages || 10;
  }
  
  function handlePageChange(page) {
    currentPage = page;
  }
  
  function setExtractionMode(mode) {
    extractionMode = mode;
  }
  
  function autoExtractBlocks() {
    const autoBlocks = [
      {
        id: `block-auto-1`,
        type: 'question',
        title: `문제 1`,
        page: currentPage,
        selection: { x: 50, y: 100, width: 400, height: 80 },
        content: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?',
        format: 'multiple_choice',
        answer: '',
        tags: [],
        linkedBlocks: [],
        extractedText: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?'
      },
      {
        id: `block-auto-2`,
        type: 'question',
        title: `문제 2`,
        page: currentPage,
        selection: { x: 50, y: 200, width: 350, height: 60 },
        content: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.',
        format: 'short_answer',
        answer: '',
        tags: [],
        linkedBlocks: [],
        extractedText: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.'
      }
    ];
    
    selectedBlocks = [...selectedBlocks, ...autoBlocks];
    nextBlockId += autoBlocks.length;
  }
  
  function proceedToConfiguration() {
    if (selectedBlocks.length === 0) {
      alert('추출할 블록을 선택해주세요.');
      return;
    }
    extractionStep = 'configure-blocks';
  }
  
  function goBack() {
    if (extractionStep === 'configure-blocks') {
      extractionStep = 'extract-blocks';
    } else {
      extractionStep = 'select-material';
    }
  }
  
  async function finalizeExtraction() {
    for (const block of selectedBlocks) {
      const blockData = {
        material_id: selectedMaterial.id,
        type: block.format || block.type,
        question: block.extractedText,
        correct_answer: block.answer || '',
        difficulty: 'medium',
        page_number: block.page,
        tags: block.tags || []
      };
      
      try {
        await addBlock($user.id, blockData);
      } catch (error) {
        console.error('Error adding block:', error);
      }
    }
    
    alert(`${selectedBlocks.length}개의 블록이 추출되었습니다!`);
    goto('/my-materials');
  }
  
  function getBlockTypeInfo(type) {
    return blockTypes.find(t => t.value === type) || blockTypes[0];
  }
</script>

<svelte:head>
  <title>문항 추출 - Class Easy</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
  <!-- 상단 헤더 -->
  <div class="bg-base-100 shadow-sm">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold">문항 추출</h1>
          {#if selectedMaterial}
            <div class="flex items-center gap-2 text-sm text-base-content/70">
              <span>{selectedMaterial.title}</span>
              <span class="text-primary">{currentPage}/{totalPages} 페이지</span>
            </div>
          {/if}
        </div>
        
        <div class="breadcrumbs text-sm">
          <ul>
            <li><a href="/">홈</a></li>
            <li>문항 추출</li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <div class="container mx-auto px-4 py-6">
    {#if extractionStep === 'select-material'}
      <!-- 자료 선택 단계 -->
      <div class="card bg-base-100 shadow">
        <div class="card-body">
          <h2 class="card-title mb-4">문항을 추출할 자료를 선택하세요</h2>
          
          {#if $materials.length === 0}
            <div class="text-center py-12">
              <div class="text-4xl mb-4">📁</div>
              <h3 class="text-lg font-medium mb-2">원본 자료가 없습니다</h3>
              <p class="text-base-content/70 mb-4">
                먼저 자료를 업로드해주세요
              </p>
              <a href="/upload" class="btn btn-primary">자료 올리기</a>
            </div>
          {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {#each $materials.filter(m => m.type === 'original') as material}
                <div 
                  class="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-primary"
                  on:click={() => selectMaterial(material)}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && selectMaterial(material)}
                >
                  <div class="card-body">
                    <div class="flex items-start justify-between mb-2">
                      <div class="text-2xl">{getFileTypeIcon(material.file_type)}</div>
                      <div class="badge badge-primary badge-sm">원본</div>
                    </div>
                    
                    <h3 class="card-title text-sm mb-2">{material.title}</h3>
                    
                    <div class="text-xs text-base-content/70 space-y-1">
                      {#if material.file_size}
                        <p>{formatFileSize(material.file_size)}</p>
                      {/if}
                      {#if material.pages}
                        <p>{material.pages}페이지</p>
                      {/if}
                    </div>
                    
                    <div class="card-actions justify-end mt-2">
                      <button class="btn btn-primary btn-sm">선택</button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
      
    {:else if extractionStep === 'extract-blocks'}
      <!-- 블록 추출 단계 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 좌측: 페이지 미리보기 -->
        <div class="lg:col-span-2">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <!-- 툴바 -->
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-4">
                  <div class="tabs tabs-boxed">
                    <button 
                      class="tab tab-sm {extractionMode === 'manual' ? 'tab-active' : ''}"
                      on:click={() => setExtractionMode('manual')}
                    >
                      수동 선택
                    </button>
                    <button 
                      class="tab tab-sm {extractionMode === 'auto' ? 'tab-active' : ''}"
                      on:click={() => setExtractionMode('auto')}
                    >
                      자동 추출
                    </button>
                  </div>
                  
                  {#if extractionMode === 'auto'}
                    <button class="btn btn-primary btn-sm" on:click={autoExtractBlocks}>
                      자동 문항 추출
                    </button>
                  {/if}
                </div>
                
                <!-- 페이지 네비게이션 -->
                <div class="flex items-center gap-2">
                  <button 
                    class="btn btn-ghost btn-sm"
                    disabled={currentPage <= 1}
                    on:click={() => handlePageChange(currentPage - 1)}
                  >
                    ←
                  </button>
                  <span class="text-sm">{currentPage} / {totalPages}</span>
                  <button 
                    class="btn btn-ghost btn-sm"
                    disabled={currentPage >= totalPages}
                    on:click={() => handlePageChange(currentPage + 1)}
                  >
                    →
                  </button>
                </div>
              </div>
              
              <!-- 페이지 미리보기 -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="bg-white shadow-lg mx-auto relative" style="width: 100%; max-width: 595px; min-height: 400px;">
                  <!-- 더미 페이지 콘텐츠 -->
                  <div class="p-6">
                    <h2 class="text-lg font-bold mb-4">수학 문제 - 페이지 {currentPage}</h2>
                    
                    <div class="space-y-4">
                      <div class="p-3 border border-gray-200 rounded">
                        <p class="font-medium mb-2">1. 다음 중 이차함수의 그래프가 아래로 볼록한 조건은?</p>
                        <div class="ml-4 space-y-1 text-sm">
                          <p>① a &gt; 0</p>
                          <p>② a &lt; 0</p>
                          <p>③ a = 0</p>
                          <p>④ 상관없음</p>
                        </div>
                      </div>
                      
                      <div class="p-3 border border-gray-200 rounded">
                        <p class="font-medium">2. f(x) = x² - 4x + 3의 최솟값을 구하시오.</p>
                      </div>
                      
                      <div class="p-3 bg-blue-50 border border-blue-200 rounded">
                        <h4 class="font-medium text-blue-800 mb-2">해설</h4>
                        <p class="text-sm text-blue-700">이차함수 f(x) = ax² + bx + c에서 a > 0이면 그래프가 아래로 볼록하다.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="mt-4 text-center">
                <p class="text-sm text-base-content/70">
                  {#if extractionMode === 'manual'}
                    수동 선택 모드: 문제 영역을 클릭하여 선택하세요
                  {:else}
                    자동 추출 모드: 자동 문항 추출 버튼을 클릭하세요
                  {/if}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 우측: 선택된 블록 관리 -->
        <div class="lg:col-span-1">
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <h3 class="card-title mb-4">선택된 블록 ({selectedBlocks.length})</h3>
              
              <div class="space-y-3">
                {#each selectedBlocks as block}
                  <div class="card bg-base-200 shadow-sm">
                    <div class="card-body p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-lg">{getBlockTypeInfo(block.type).icon}</span>
                        <span class="font-medium text-sm">{block.title}</span>
                        <div class="badge badge-xs">페이지 {block.page}</div>
                      </div>
                      
                      <p class="text-xs text-base-content/70 mb-2">
                        {block.extractedText}
                      </p>
                      
                      <select 
                        class="select select-xs select-bordered w-full"
                        bind:value={block.type}
                      >
                        {#each blockTypes as type}
                          <option value={type.value}>{type.label}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                {/each}
                
                {#if selectedBlocks.length === 0}
                  <div class="text-center py-8">
                    <div class="text-4xl mb-2">📝</div>
                    <p class="text-sm text-base-content/70">
                      {#if extractionMode === 'manual'}
                        페이지에서 블록을 선택하세요
                      {:else}
                        자동 문항 추출 버튼을 눌러주세요
                      {/if}
                    </p>
                  </div>
                {/if}
              </div>
              
              <div class="card-actions justify-end mt-4">
                <button class="btn btn-outline btn-sm" on:click={goBack}>
                  뒤로
                </button>
                <button 
                  class="btn btn-primary btn-sm" 
                  disabled={selectedBlocks.length === 0}
                  on:click={proceedToConfiguration}
                >
                  추출하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    {:else if extractionStep === 'configure-blocks'}
      <!-- 2단계: 추가 정보 입력 -->
      <div class="space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold">추가 정보 입력</h2>
            <p class="text-base-content/70">추출된 블록들의 세부 정보를 입력하세요</p>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-outline" on:click={goBack}>
              뒤로
            </button>
            <button class="btn btn-primary" on:click={finalizeExtraction}>
              추출 완료
            </button>
          </div>
        </div>
        
        {#each selectedBlocks as block}
          <div class="card bg-base-100 shadow">
            <div class="card-body">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- 블록 미리보기 -->
                <div class="lg:col-span-1">
                  <div class="bg-base-200 p-4 rounded">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">{getBlockTypeInfo(block.type).icon}</span>
                      <span class="font-medium">{block.title}</span>
                      <div class="badge badge-xs">페이지 {block.page}</div>
                    </div>
                    <p class="text-sm text-base-content/70">{block.extractedText}</p>
                  </div>
                </div>
                
                <!-- 설정 패널 -->
                <div class="lg:col-span-2 space-y-4">
                  <!-- 기본 정보 -->
                  <div class="grid grid-cols-2 gap-4">
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">블록 이름</span>
                      </label>
                      <input 
                        type="text" 
                        class="input input-bordered input-sm" 
                        bind:value={block.title}
                      />
                    </div>
                    
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">블록 타입</span>
                      </label>
                      <select class="select select-bordered select-sm" bind:value={block.type}>
                        {#each blockTypes as type}
                          <option value={type.value}>{type.label}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                  
                  <!-- 문제 타입일 때 추가 설정 -->
                  {#if block.type === 'question'}
                    <div class="grid grid-cols-2 gap-4">
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">문항 형식</span>
                        </label>
                        <select class="select select-bordered select-sm" bind:value={block.format}>
                          {#each questionFormats as format}
                            <option value={format.value}>{format.label}</option>
                          {/each}
                        </select>
                      </div>
                      
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">정답</span>
                        </label>
                        <input 
                          type="text" 
                          class="input input-bordered input-sm" 
                          bind:value={block.answer}
                          placeholder="정답을 입력하세요"
                        />
                      </div>
                    </div>
                  {/if}
                  
                  <!-- 태그 -->
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text">태그</span>
                    </label>
                    <div class="flex flex-wrap gap-2">
                      {#each difficultyTags as tag}
                        <label class="cursor-pointer">
                          <input 
                            type="checkbox" 
                            class="checkbox checkbox-primary checkbox-sm" 
                            bind:group={block.tags}
                            value={tag.value}
                          />
                          <span class="label-text ml-2 text-sm">{tag.label}</span>
                        </label>
                      {/each}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>