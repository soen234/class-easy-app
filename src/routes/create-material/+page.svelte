<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials } from '$lib/stores/materials.js';
  import { templates } from '$lib/stores/templates.js';
  
  // Wizard state
  let currentStep = 1;
  let totalSteps = 4;
  
  // Form data
  let selectedTemplateId = '';
  let selectedTemplate = null;
  let materialData = {
    title: '',
    subject: '',
    grade: '',
    folder_id: null,
    tags: [],
    is_public: false,
    content: []
  };
  
  let tagInput = '';
  let availableFolders = [];
  let saving = false;
  let fromQuestionBank = false;
  let selectedQuestions = [];
  
  // Get available subjects and grades
  const subjects = ['국어', '영어', '수학', '사회', '과학', '기타'];
  const grades = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
  
  onMount(async () => {
    // Get template ID from URL
    const templateId = $page.url.searchParams.get('template');
    if (templateId) {
      selectedTemplateId = templateId;
      selectedTemplate = templates.getTemplateById(templateId);
      if (selectedTemplate) {
        // Initialize content from template
        materialData.content = selectedTemplate.elements.map(el => ({
          type: el.type,
          content: el.defaultContent || '',
          config: el.config || {}
        }));
      }
    }
    
    // Check if coming from question bank
    fromQuestionBank = $page.url.searchParams.get('from') === 'question-bank';
    if (fromQuestionBank) {
      const stored = localStorage.getItem('selectedQuestions');
      if (stored) {
        selectedQuestions = JSON.parse(stored);
        // 템플릿 선택 후, 문항들을 자동으로 content에 추가
        if (selectedTemplate && currentStep === 3) {
          addQuestionsToContent();
        }
      }
    }
    
    // Get available folders
    if ($user?.id) {
      const folders = await materials.getFolderStructure($user.id);
      availableFolders = folders;
    }
  });
  
  function addQuestionsToContent() {
    // 선택된 문항들을 content에 추가
    selectedQuestions.forEach((question, index) => {
      materialData.content.push({
        type: 'question',
        content: question.question,
        config: {
          questionType: question.type,
          difficulty: question.difficulty,
          correctAnswer: question.correct_answer,
          options: question.options,
          explanation: question.explanation,
          points: question.points,
          tags: question.tags
        }
      });
    });
  }
  
  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
      // 문제은행에서 왔고 템플릿 선택 후 content 단계로 진입하면 문항 추가
      if (fromQuestionBank && currentStep === 3 && selectedTemplate) {
        addQuestionsToContent();
      }
    }
  }
  
  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
    }
  }
  
  function selectTemplate(template) {
    selectedTemplateId = template.id;
    selectedTemplate = template;
    // Initialize content from template
    materialData.content = template.elements.map(el => ({
      type: el.type,
      content: el.defaultContent || '',
      config: el.config || {}
    }));
  }
  
  function addTag() {
    if (tagInput.trim() && !materialData.tags.includes(tagInput.trim())) {
      materialData.tags = [...materialData.tags, tagInput.trim()];
      tagInput = '';
    }
  }
  
  function removeTag(tag) {
    materialData.tags = materialData.tags.filter(t => t !== tag);
  }
  
  function addContentElement() {
    materialData.content = [...materialData.content, {
      type: 'text',
      content: '',
      config: {}
    }];
  }
  
  function removeContentElement(index) {
    materialData.content = materialData.content.filter((_, i) => i !== index);
  }
  
  function moveElement(index, direction) {
    const newContent = [...materialData.content];
    const targetIndex = index + direction;
    
    if (targetIndex >= 0 && targetIndex < newContent.length) {
      [newContent[index], newContent[targetIndex]] = [newContent[targetIndex], newContent[index]];
      materialData.content = newContent;
    }
  }
  
  async function saveMaterial() {
    if (!$user?.id) {
      alert('로그인이 필요합니다.');
      return;
    }
    
    saving = true;
    
    try {
      const result = await materials.createMaterial({
        ...materialData,
        user_id: $user.id,
        template_id: selectedTemplateId || null
      });
      
      if (result.error) {
        alert('자료 생성 중 오류가 발생했습니다.');
      } else {
        // 선택된 문항 정보 삭제
        if (fromQuestionBank) {
          localStorage.removeItem('selectedQuestions');
        }
        goto('/my-materials');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('자료 생성 중 오류가 발생했습니다.');
    } finally {
      saving = false;
    }
  }
  
  function getStepTitle() {
    switch (currentStep) {
      case 1: return '템플릿 선택';
      case 2: return '기본 정보';
      case 3: return '내용 편집';
      case 4: return '미리보기';
      default: return '';
    }
  }
  
  function getContentTypeLabel(type) {
    const types = {
      title: '제목',
      text: '텍스트',
      question: '문항',
      multipleChoice: '객관식',
      shortAnswer: '단답형',
      essay: '서술형',
      image: '이미지',
      table: '표',
      divider: '구분선'
    };
    return types[type] || type;
  }
  
  function getContentTypeIcon(type) {
    const icons = {
      title: 'M4 6h16M4 12h8m-8 6h16',
      text: 'M4 6h16M4 10h16M4 14h16M4 18h16',
      question: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      multipleChoice: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      shortAnswer: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      essay: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      image: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      table: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      divider: 'M20 12H4'
    };
    return icons[type] || 'M4 6h16M4 12h16M4 18h16';
  }
</script>

<svelte:head>
  <title>자료 만들기 - Class Easy</title>
</svelte:head>

<div class="min-h-screen bg-base-200">
  <div class="container mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="breadcrumbs text-sm mb-4">
        <ul>
          <li><a href="/">홈</a></li>
          {#if fromQuestionBank}
            <li><a href="/question-bank">문제 은행</a></li>
          {/if}
          <li><a href="/templates">템플릿</a></li>
          <li>자료 만들기</li>
        </ul>
      </div>
      <h1 class="text-3xl font-bold">{getStepTitle()}</h1>
      {#if fromQuestionBank && selectedQuestions.length > 0}
        <p class="text-base-content/70 mt-2">{selectedQuestions.length}개의 문항이 선택되었습니다</p>
      {/if}
    </div>
    
    <!-- Progress Steps -->
    <div class="mb-8">
      <ul class="steps steps-horizontal w-full">
        <li class="step {currentStep >= 1 ? 'step-primary' : ''}">템플릿 선택</li>
        <li class="step {currentStep >= 2 ? 'step-primary' : ''}">기본 정보</li>
        <li class="step {currentStep >= 3 ? 'step-primary' : ''}">내용 편집</li>
        <li class="step {currentStep >= 4 ? 'step-primary' : ''}">미리보기</li>
      </ul>
    </div>
    
    <!-- Step Content -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        {#if currentStep === 1}
          <!-- Step 1: Template Selection -->
          <h2 class="card-title mb-6">템플릿을 선택하세요</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Blank Template -->
            <div class="card bg-base-200 {selectedTemplateId === 'blank' ? 'ring-2 ring-primary' : ''} cursor-pointer hover:shadow-lg transition-all"
                 on:click={() => selectTemplate({ id: 'blank', name: '빈 템플릿', elements: [] })}>
              <div class="card-body text-center">
                <div class="text-5xl mb-4">📄</div>
                <h3 class="font-bold">빈 템플릿</h3>
                <p class="text-sm text-base-content/70">처음부터 시작하기</p>
              </div>
            </div>
            
            <!-- Predefined Templates -->
            {#each templates.getAllTemplates() as template}
              <div class="card bg-base-200 {selectedTemplateId === template.id ? 'ring-2 ring-primary' : ''} cursor-pointer hover:shadow-lg transition-all"
                   on:click={() => selectTemplate(template)}>
                <div class="card-body">
                  <div class="badge badge-primary badge-sm mb-2">{templates.getCategoryLabel(template.category)}</div>
                  <h3 class="font-bold">{template.name}</h3>
                  <p class="text-sm text-base-content/70 line-clamp-2">{template.description}</p>
                  <div class="mt-2">
                    <div class="badge badge-outline badge-xs">{templates.getDifficultyLabel(template.difficulty)}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          
        {:else if currentStep === 2}
          <!-- Step 2: Basic Information -->
          <h2 class="card-title mb-6">기본 정보를 입력하세요</h2>
          
          <div class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">제목 *</span>
              </label>
              <input type="text" placeholder="자료 제목을 입력하세요" class="input input-bordered"
                     bind:value={materialData.title} />
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">과목 *</span>
                </label>
                <select class="select select-bordered" bind:value={materialData.subject}>
                  <option value="">선택하세요</option>
                  {#each subjects as subject}
                    <option value={subject}>{subject}</option>
                  {/each}
                </select>
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">학년 *</span>
                </label>
                <select class="select select-bordered" bind:value={materialData.grade}>
                  <option value="">선택하세요</option>
                  {#each grades as grade}
                    <option value={grade}>{grade}</option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">폴더</span>
              </label>
              <select class="select select-bordered" bind:value={materialData.folder_id}>
                <option value={null}>폴더 없음</option>
                {#each availableFolders as folder}
                  <option value={folder.id}>{folder.name}</option>
                {/each}
              </select>
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">태그</span>
              </label>
              <div class="flex gap-2">
                <input type="text" placeholder="태그 입력 후 Enter" class="input input-bordered flex-1"
                       bind:value={tagInput}
                       on:keydown={(e) => e.key === 'Enter' && addTag()} />
                <button class="btn btn-primary" on:click={addTag}>추가</button>
              </div>
              <div class="flex flex-wrap gap-2 mt-2">
                {#each materialData.tags as tag}
                  <div class="badge badge-primary gap-2">
                    {tag}
                    <button on:click={() => removeTag(tag)}>
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
            
            <div class="form-control">
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox" bind:checked={materialData.is_public} />
                <span class="label-text">공개 자료로 설정</span>
              </label>
            </div>
          </div>
          
        {:else if currentStep === 3}
          <!-- Step 3: Content Editing -->
          <div class="flex justify-between items-center mb-6">
            <h2 class="card-title">내용을 편집하세요</h2>
            <button class="btn btn-primary btn-sm" on:click={addContentElement}>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              요소 추가
            </button>
          </div>
          
          <div class="space-y-4">
            {#each materialData.content as element, index}
              <div class="card bg-base-200">
                <div class="card-body">
                  <div class="flex items-start gap-4">
                    <div class="flex flex-col gap-1">
                      <button class="btn btn-ghost btn-xs" 
                              disabled={index === 0}
                              on:click={() => moveElement(index, -1)}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
                        </svg>
                      </button>
                      <button class="btn btn-ghost btn-xs"
                              disabled={index === materialData.content.length - 1}
                              on:click={() => moveElement(index, 1)}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getContentTypeIcon(element.type)}></path>
                          </svg>
                          <select class="select select-bordered select-sm" bind:value={element.type}>
                            <option value="title">제목</option>
                            <option value="text">텍스트</option>
                            <option value="question">문항</option>
                            <option value="image">이미지</option>
                            <option value="table">표</option>
                            <option value="divider">구분선</option>
                          </select>
                        </div>
                        <button class="btn btn-ghost btn-sm text-error" 
                                on:click={() => removeContentElement(index)}>
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                      
                      {#if element.type === 'title'}
                        <input type="text" placeholder="제목을 입력하세요" 
                               class="input input-bordered w-full"
                               bind:value={element.content} />
                      {:else if element.type === 'text' || element.type === 'question'}
                        <textarea placeholder="{element.type === 'question' ? '문항 내용을 입력하세요' : '텍스트를 입력하세요'}" 
                                  class="textarea textarea-bordered w-full"
                                  rows="3"
                                  bind:value={element.content}></textarea>
                        {#if element.type === 'question' && element.config}
                          <div class="mt-2 text-sm">
                            <span class="badge badge-outline badge-sm mr-2">{getContentTypeLabel(element.config.questionType)}</span>
                            <span class="badge badge-outline badge-sm mr-2">{templates.getDifficultyLabel(element.config.difficulty)}</span>
                            {#if element.config.correctAnswer}
                              <span class="text-base-content/70">정답: {element.config.correctAnswer}</span>
                            {/if}
                          </div>
                        {/if}
                      {:else if element.type === 'divider'}
                        <div class="divider"></div>
                      {:else}
                        <div class="alert">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                          <span>{getContentTypeLabel(element.type)} 요소는 아직 지원되지 않습니다.</span>
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
            
            {#if materialData.content.length === 0}
              <div class="text-center py-8">
                <p class="text-base-content/70 mb-4">아직 내용이 없습니다.</p>
                <button class="btn btn-primary" on:click={addContentElement}>
                  첫 번째 요소 추가하기
                </button>
              </div>
            {/if}
          </div>
          
        {:else if currentStep === 4}
          <!-- Step 4: Preview -->
          <h2 class="card-title mb-6">미리보기</h2>
          
          <div class="prose max-w-none">
            <h1>{materialData.title || '제목 없음'}</h1>
            
            <div class="flex gap-2 mb-4">
              <span class="badge badge-outline">{materialData.subject || '과목 미지정'}</span>
              <span class="badge badge-outline">{materialData.grade || '학년 미지정'}</span>
              {#if materialData.is_public}
                <span class="badge badge-success">공개</span>
              {:else}
                <span class="badge badge-warning">비공개</span>
              {/if}
            </div>
            
            {#if materialData.tags.length > 0}
              <div class="flex gap-2 mb-4">
                {#each materialData.tags as tag}
                  <span class="badge badge-primary badge-sm">{tag}</span>
                {/each}
              </div>
            {/if}
            
            <div class="divider"></div>
            
            {#each materialData.content as element}
              {#if element.type === 'title'}
                <h2>{element.content || '제목'}</h2>
              {:else if element.type === 'text'}
                <p>{element.content || '내용'}</p>
              {:else if element.type === 'question'}
                <div class="card bg-base-200 mb-4">
                  <div class="card-body">
                    <p class="font-medium">{element.content}</p>
                    {#if element.config?.correctAnswer}
                      <p class="text-sm text-base-content/70">정답: {element.config.correctAnswer}</p>
                    {/if}
                  </div>
                </div>
              {:else if element.type === 'divider'}
                <div class="divider"></div>
              {/if}
            {/each}
          </div>
        {/if}
        
        <!-- Navigation Buttons -->
        <div class="card-actions justify-between mt-8">
          <button class="btn btn-outline" 
                  disabled={currentStep === 1}
                  on:click={prevStep}>
            이전
          </button>
          
          <div class="flex gap-2">
            {#if currentStep < totalSteps}
              <button class="btn btn-primary"
                      disabled={currentStep === 1 && !selectedTemplateId}
                      on:click={nextStep}>
                다음
              </button>
            {:else}
              <button class="btn btn-success"
                      disabled={saving || !materialData.title || !materialData.subject || !materialData.grade}
                      on:click={saveMaterial}>
                {#if saving}
                  <span class="loading loading-spinner loading-sm"></span>
                {/if}
                저장하기
              </button>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>