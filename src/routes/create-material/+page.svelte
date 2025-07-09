<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import { materials, createMaterial, getFolderStructure } from '$lib/stores/materials.js';
  import { templates, getCategoryLabel, getDifficultyLabel } from '$lib/stores/templates.js';
  import { getBlockTypeLabel, getDifficultyBadgeClass, getQuestionSubtypeLabel } from '$lib/stores/blocks.js';
  import QuestionSelectModal from '$lib/components/QuestionSelectModal.svelte';
  
  // Lazy load components and functions to avoid SSR issues
  let MaterialCanvasPreview;
  let exportAsPDF, exportAsDOCX, exportAsHWP;
  
  async function loadExportFunctions() {
    if (typeof window !== 'undefined' && !exportAsDOCX) {
      const exportModule = await import('$lib/utils/exportManager.js');
      exportAsPDF = exportModule.exportAsPDF;
      exportAsDOCX = exportModule.exportAsDOCX;
      exportAsHWP = exportModule.exportAsHWP;
    }
  }
  
  // Wizard state
  let currentStep = 1;
  let totalSteps = 2;
  
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
  
  // 문항이 이미 추가되었는지 추적
  let questionsAdded = false;
  
  let tagInput = '';
  let availableFolders = [];
  let saving = false;
  let fromQuestionBank = false;
  let selectedQuestions = [];
  let canvasPreview;
  let showExportOptions = false;
  let isBrowser = false;
  let canvasReady = false;
  
  // 편집 도구 관련 변수
  let selectedTool = 'select'; // 기본 선택 도구
  let showBlockList = false; // 블록 리스트 표시 여부
  let showShapeMenu = false;
  let selectedShape = null;
  let showQuestionSelectModal = false;
  let showPropertiesPanel = true; // 속성 패널 표시 여부
  let selectedObject = null; // 선택된 객체
  
  // 포맷 옵션 상태
  let formatOptions = {
    fontSize: 'medium',
    columns: 1,
    questionSpacing: 'normal',
    showDifficulty: 'none',
    showSources: false,
    pageSize: 'A4',
    showGrid: true,
    orientation: 'portrait' // 'portrait' or 'landscape'
  };
  
  // formatOptions가 변경될 때마다 로그 (브라우저에서만)
  $: if (typeof window !== 'undefined') {
    console.log('Format options changed:', formatOptions);
  }
  
  // Get available subjects and grades
  const subjects = ['국어', '영어', '수학', '사회', '과학', '기타'];
  const grades = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];
  
  onMount(async () => {
    // Set browser flag
    isBrowser = true;
    
    // Load export functions
    await loadExportFunctions();
    
    // Dynamically import MaterialCanvasPreview to avoid SSR issues
    if (!MaterialCanvasPreview) {
      const module = await import('$lib/components/MaterialCanvasPreview.svelte');
      MaterialCanvasPreview = module.default;
    }
    
    // Delay canvas initialization to ensure all dependencies are ready
    setTimeout(() => {
      canvasReady = true;
    }, 100);
    // Get template ID from URL
    const templateId = $page.url.searchParams.get('template');
    if (templateId) {
      selectedTemplateId = templateId;
      selectedTemplate = templates.getTemplateById(templateId);
      if (selectedTemplate) {
        // Initialize content from template
        if (selectedTemplate.elements) {
          materialData.content = selectedTemplate.elements.map(el => ({
            type: el.type,
            content: el.defaultContent || '',
            config: el.config || {}
          }));
        } else {
          materialData.content = [];
        }
      }
    }
    
    // Check if coming from question bank
    fromQuestionBank = $page.url.searchParams.get('from') === 'question-bank';
    if (fromQuestionBank) {
      // 저장된 draft 정보 불러오기
      const draft = localStorage.getItem('materialDraft');
      if (draft) {
        const draftData = JSON.parse(draft);
        materialData.title = draftData.title || '';
        materialData.subject = draftData.subject || '';
        materialData.grade = draftData.grade || '';
        materialData.folder_id = draftData.folder_id || null;
        materialData.tags = draftData.tags || [];
        materialData.is_public = draftData.is_public || false;
        localStorage.removeItem('materialDraft');
      }
      
      const stored = localStorage.getItem('selectedQuestions');
      if (stored) {
        selectedQuestions = JSON.parse(stored);
        console.log('Loaded questions from localStorage:', selectedQuestions);
        // 시험지 템플릿 자동 선택
        selectedTemplateId = 'test';
        selectedTemplate = templates.getTemplateById('test');
      }
    }
    
    // Get available folders
    if ($user?.id) {
      const folders = getFolderStructure();
      availableFolders = folders;
    }
  });
  
  function addQuestionsToContent() {
    if (questionsAdded) {
      console.log('Questions already added, skipping...');
      return;
    }
    
    console.log('Adding questions to content:', selectedQuestions);
    // Clear existing content to prevent duplicates
    materialData.content = [];
    // 선택된 문항들을 content에 추가
    selectedQuestions.forEach((question, index) => {
      console.log(`Processing question ${index + 1}:`, question);
      const questionContent = {
        type: 'question',
        content: question.content || question.question || '',
        title: question.title || `문항 ${index + 1}`,  // title 필드 추가
        config: {
          questionType: question.subtype || question.type,
          difficulty: question.difficulty,
          correctAnswer: question.correct_answer,
          options: question.options,
          explanation: question.explanation,
          points: question.score || question.points,
          tags: question.tags,
          customTags: question.custom_tags,
          chapter: question.chapter,
          materialTitle: question.material_title,
          imageUrl: question.image_data || question.image_url || null,  // image_data 우선 사용
          questionNumber: index + 1
        }
      };
      
      console.log(`Question ${index + 1} image URL:`, questionContent.config.imageUrl);
      
      materialData.content.push(questionContent);
    });
    
    questionsAdded = true;
  }
  
  function nextStep() {
    // 문제은행 경로를 선택했지만 문제가 없는 경우
    if (fromQuestionBank && selectedQuestions.length === 0) {
      // 문항 선택 모달 표시
      showQuestionSelectModal = true;
      return;
    }
    
    if (currentStep < totalSteps) {
      currentStep++;
      // 문제은행에서 왔고 편집 단계로 진입하면 문항 추가
      if (fromQuestionBank && currentStep === 2 && !questionsAdded) {
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
    if (template.elements) {
      materialData.content = template.elements.map(el => ({
        type: el.type,
        content: el.defaultContent || '',
        config: el.config || {}
      }));
    } else {
      // For templates without elements property, use empty content
      materialData.content = [];
    }
    
    // Don't add questions here - they will be added when moving to step 3
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
      const result = await createMaterial({
        ...materialData,
        user_id: $user.id,
        template_id: selectedTemplateId || null
      });
      
      // createMaterial returns the data directly on success
      // 선택된 문항 정보 삭제
      if (fromQuestionBank) {
        localStorage.removeItem('selectedQuestions');
      }
      goto('/my-materials');
    } catch (error) {
      console.error('Save error:', error);
      alert('자료 생성 중 오류가 발생했습니다.');
    } finally {
      saving = false;
    }
  }
  
  async function exportDocument(format) {
    showExportOptions = false;
    
    if (!canvasPreview) {
      alert('미리보기가 준비되지 않았습니다.');
      return;
    }
    
    // Ensure export functions are loaded
    await loadExportFunctions();
    
    if (!exportAsDOCX || !exportAsHWP) {
      alert('내보내기 기능을 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    try {
      if (format === 'pdf') {
        await canvasPreview.exportToPDF();
      } else if (format === 'docx') {
        await exportAsDOCX(materialData.content, {
          ...formatOptions,
          title: materialData.title,
          subject: materialData.subject,
          grade: materialData.grade,
          useImages: true
        });
      } else if (format === 'docx-text') {
        await exportAsDOCX(materialData.content, {
          ...formatOptions,
          title: materialData.title,
          subject: materialData.subject,
          grade: materialData.grade,
          useImages: false
        });
      } else if (format === 'hwp') {
        await exportAsHWP(materialData.content, {
          ...formatOptions,
          title: materialData.title,
          subject: materialData.subject,
          grade: materialData.grade
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('내보내기 중 오류가 발생했습니다.');
    }
  }
  
  function getStepTitle() {
    switch (currentStep) {
      case 1: return '기본 정보';
      case 2: return '자료 편집';
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
  
  async function handleExport(format) {
    // Ensure export functions are loaded
    await loadExportFunctions();
    
    if (!exportAsPDF || !exportAsDOCX || !exportAsHWP) {
      alert('내보내기 기능을 로드하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    
    const formatOpts = formatOptions;
    
    const testInf = {
      title: materialData.title,
      subject: materialData.subject,
      grade: materialData.grade,
      date: new Date().toLocaleDateString('ko-KR'),
      instructions: '※ 문제를 잘 읽고 답안을 작성하시오.'
    };
    
    switch (format) {
      case 'pdf':
        // PDF export needs canvas and pages from preview component
        if (canvasPreview && canvasPreview.exportToPDF) {
          await canvasPreview.exportToPDF();
        } else {
          alert('PDF 내보내기를 위해 미리보기를 먼저 생성해주세요.');
        }
        break;
        
      case 'docx':
        await exportAsDOCX(materialData.content, {
          ...formatOpts,
          fileName: `${materialData.title || 'material'}.docx`
        }, testInf);
        break;
        
      case 'hwp':
        await exportAsHWP(materialData.content, {
          ...formatOpts,
          fileName: `${materialData.title || 'material'}.txt`
        }, testInf);
        break;
    }
  }
  
  // 문항 제거 함수
  function removeQuestion(index) {
    selectedQuestions = selectedQuestions.filter((_, i) => i !== index);
    // localStorage 업데이트
    if (fromQuestionBank) {
      localStorage.setItem('selectedQuestions', JSON.stringify(selectedQuestions));
    }
  }
  
  // 모든 문항 삭제
  function clearAllQuestions() {
    if (confirm('모든 문항을 삭제하시겠습니까?')) {
      selectedQuestions = [];
      if (fromQuestionBank) {
        localStorage.removeItem('selectedQuestions');
      }
    }
  }
  
  // 문항 선택 모달에서 선택 완료 시
  function handleQuestionsSelected(questions) {
    selectedQuestions = questions;
    if (fromQuestionBank) {
      localStorage.setItem('selectedQuestions', JSON.stringify(questions));
    }
    showQuestionSelectModal = false;
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
        <li class="step {currentStep >= 1 ? 'step-primary' : ''}">기본 정보</li>
        <li class="step {currentStep >= 2 ? 'step-primary' : ''}">자료 편집</li>
      </ul>
    </div>
    
    <!-- Step Content -->
    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        {#if currentStep === 1}
          <!-- Step 1: Basic Information and Start Method -->
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
            
            <!-- 시작 방법 선택 -->
            <div class="divider">시작 방법 선택</div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- 빈 캔버스 -->
              <div class="card bg-base-200 {selectedTemplateId === 'blank' ? 'ring-2 ring-primary' : ''} cursor-pointer hover:shadow-lg transition-all"
                   on:click={() => selectTemplate(templates.getTemplateById('blank'))}>
                <div class="card-body text-center">
                  <div class="text-4xl mb-2">📄</div>
                  <h3 class="font-bold">빈 캔버스로 시작</h3>
                  <p class="text-sm text-base-content/70">자유롭게 편집할 수 있는 빈 캔버스</p>
                </div>
              </div>
              
              <!-- 문제 선택 -->
              <div class="card bg-base-200 {selectedTemplateId === 'test' || fromQuestionBank ? 'ring-2 ring-primary' : ''} cursor-pointer hover:shadow-lg transition-all"
                   on:click={() => {
                     selectTemplate(templates.getTemplateById('test'));
                     fromQuestionBank = true;
                     showQuestionSelectModal = true;
                   }}>
                <div class="card-body text-center">
                  <div class="text-4xl mb-2">📝</div>
                  <h3 class="font-bold">문제 선택하여 시작</h3>
                  <p class="text-sm text-base-content/70">문제은행에서 문제를 선택하여 시작</p>
                  {#if fromQuestionBank && selectedQuestions.length > 0}
                    <div class="badge badge-primary mt-2">{selectedQuestions.length}개 선택됨</div>
                  {/if}
                </div>
              </div>
            </div>
            
            {#if fromQuestionBank && selectedQuestions.length === 0}
              <div class="alert alert-info">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>다음 버튼을 클릭하면 문제를 선택할 수 있습니다.</span>
              </div>
            {/if}
          </div>
          
          <!-- 선택된 문항 리스트 -->
          {#if selectedQuestions.length > 0}
            <div class="divider">선택된 문항</div>
            
            <div class="bg-base-200 rounded-lg p-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="font-semibold">
                  선택된 문항 ({selectedQuestions.length}개)
                </h3>
                <button 
                  class="btn btn-sm btn-primary"
                  on:click={() => showQuestionSelectModal = true}
                >
                  문항 추가하기
                </button>
              </div>
              
              <!-- 반응형 그리드 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                {#each selectedQuestions as question, index}
                  <div class="bg-base-100 rounded-lg p-3 relative">
                    <!-- 문항 번호 -->
                    <div class="flex items-start gap-3">
                      <div class="text-lg font-bold text-primary">
                        {index + 1}.
                      </div>
                      
                      <!-- 문항 정보 -->
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-wrap gap-1 mb-1">
                          <span class="badge badge-sm badge-ghost">
                            {getQuestionSubtypeLabel(question.subtype)}
                          </span>
                          <span class="badge badge-sm {getDifficultyBadgeClass(question.difficulty)}">
                            {getDifficultyLabel(question.difficulty)}
                          </span>
                        </div>
                        
                        <!-- 출처 정보 -->
                        <p class="text-xs text-base-content/60 mb-1">
                          {question.material_title || '원본 자료'} 
                          {question.page_number ? `p.${question.page_number}` : ''}
                        </p>
                        
                        <!-- 문항 내용 미리보기 -->
                        <p class="text-sm line-clamp-2">
                          {question.content}
                        </p>
                      </div>
                      
                      <!-- 삭제 버튼 -->
                      <button 
                        class="btn btn-ghost btn-xs text-error"
                        on:click={() => removeQuestion(index)}
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                {/each}
              </div>
              
              <!-- 액션 버튼들 -->
              <div class="flex gap-2 mt-4">
                <button 
                  class="btn btn-sm btn-ghost"
                  on:click={clearAllQuestions}
                >
                  전체 삭제
                </button>
              </div>
            </div>
          {/if}
          
        {:else if currentStep === 2}
          <!-- Step 2: Content Editing -->
          <div class="flex flex-col" style="height: calc(100vh - 200px);">
            <!-- Header -->
            <div class="flex justify-between items-center mb-4 relative flex-shrink-0">
              <h2 class="text-xl font-semibold">내용 편집</h2>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-outline" on:click={() => showExportOptions = !showExportOptions}>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  내보내기
                </button>
              </div>
            </div>
          
            <!-- Export Options Modal -->
            {#if showExportOptions}
              <div class="absolute top-16 right-0 z-10 bg-base-100 rounded-lg shadow-xl p-4 w-64">
                <h4 class="font-semibold mb-3">내보내기 형식 선택</h4>
                <div class="space-y-2">
                  <button class="btn btn-sm btn-block btn-outline" on:click={() => exportDocument('pdf')}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    PDF
                  </button>
                  <button class="btn btn-sm btn-block btn-outline" on:click={() => exportDocument('docx')}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    DOCX (이미지)
                  </button>
                  <button class="btn btn-sm btn-block btn-outline" on:click={() => exportDocument('docx-text')}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    DOCX (텍스트)
                  </button>
                  <button class="btn btn-sm btn-block btn-outline" on:click={() => exportDocument('hwp')}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    HWP (텍스트)
                  </button>
                </div>
              </div>
            {/if}
          
            <!-- Main Content Area -->
            <div class="flex-1 flex gap-4 overflow-hidden">
              <!-- Left Toolbar -->
              <div class="w-24 bg-base-100 shadow-md flex flex-col items-center py-4 space-y-2 flex-shrink-0 relative">
                <!-- Select Tool -->
                <button 
                  class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20"
                  class:btn-active={selectedTool === 'select'}
                  on:click={() => { selectedTool = 'select'; showBlockList = false; showShapeMenu = false; }}
                  title="선택"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path>
                  </svg>
                  <span class="text-xs">선택</span>
                </button>
                
                <!-- Text Tool -->
                <button 
                  class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20"
                  class:btn-active={selectedTool === 'text'}
                  on:click={() => { selectedTool = 'text'; showBlockList = false; showShapeMenu = false; }}
                  title="텍스트"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  <span class="text-xs">텍스트</span>
                </button>
                
                <!-- Shape Tool -->
                <div class="relative">
                  <button 
                    class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20"
                    class:btn-active={selectedTool === 'shape'}
                    on:click={() => { selectedTool = 'shape'; showBlockList = false; showShapeMenu = !showShapeMenu; }}
                    title="도형"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                    </svg>
                    <span class="text-xs">도형</span>
                  </button>
                  
                  <!-- Shape Menu -->
                  {#if showShapeMenu && selectedTool === 'shape'}
                    <div class="absolute left-full top-0 ml-2 bg-base-100 shadow-lg rounded-lg p-2 w-48 z-10">
                      <div class="grid grid-cols-2 gap-1">
                        <button 
                          class="btn btn-ghost btn-sm h-auto flex-col gap-1 py-2"
                          on:click={() => { selectedShape = { id: 'rectangle', name: '사각형' }; showShapeMenu = false; }}
                        >
                          <span class="text-2xl">□</span>
                          <span class="text-xs">사각형</span>
                        </button>
                        <button 
                          class="btn btn-ghost btn-sm h-auto flex-col gap-1 py-2"
                          on:click={() => { selectedShape = { id: 'circle', name: '원' }; showShapeMenu = false; }}
                        >
                          <span class="text-2xl">○</span>
                          <span class="text-xs">원</span>
                        </button>
                        <button 
                          class="btn btn-ghost btn-sm h-auto flex-col gap-1 py-2"
                          on:click={() => { selectedShape = { id: 'triangle', name: '삼각형' }; showShapeMenu = false; }}
                        >
                          <span class="text-2xl">△</span>
                          <span class="text-xs">삼각형</span>
                        </button>
                        <button 
                          class="btn btn-ghost btn-sm h-auto flex-col gap-1 py-2"
                          on:click={() => { selectedShape = { id: 'line', name: '선' }; showShapeMenu = false; }}
                        >
                          <span class="text-2xl">—</span>
                          <span class="text-xs">선</span>
                        </button>
                      </div>
                    </div>
                  {/if}
                </div>
                
                <!-- Image Tool -->
                <button 
                  class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20"
                  class:btn-active={selectedTool === 'image'}
                  on:click={() => { selectedTool = 'image'; showBlockList = false; showShapeMenu = false; }}
                  title="이미지"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="text-xs">이미지</span>
                </button>
                
                
                <!-- Block Tool -->
                <button 
                  class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20"
                  class:btn-active={selectedTool === 'block'}
                  on:click={() => { selectedTool = 'block'; showBlockList = true; showShapeMenu = false; }}
                  title="문제"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                  <span class="text-xs">문제</span>
                </button>
                
                <div class="divider my-1"></div>
                
                <!-- Grid Toggle -->
                <button 
                  class="btn btn-ghost btn-sm btn-square"
                  on:click={() => formatOptions.showGrid = !formatOptions.showGrid}
                  title="그리드 표시"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
                  </svg>
                </button>
              </div>
              
              <!-- Center Canvas Area -->
              <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Format Options Bar -->
                {#if fromQuestionBank}
                  <div class="bg-base-200 rounded-lg p-3 mb-3 flex-shrink-0">
                    <div class="flex items-center gap-4">
                      <div class="flex items-center gap-2">
                        <label class="text-sm">용지:</label>
                        <select class="select select-xs select-bordered" bind:value={formatOptions.pageSize}>
                          <option value="A4">A4</option>
                          <option value="A3">A3</option>
                          <option value="B4">B4</option>
                          <option value="B3">B3</option>
                        </select>
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="text-sm">방향:</label>
                        <div class="btn-group btn-group-xs">
                          <button 
                            class="btn {formatOptions.orientation === 'portrait' ? 'btn-active' : ''}"
                            on:click={() => formatOptions.orientation = 'portrait'}
                          >세로</button>
                          <button 
                            class="btn {formatOptions.orientation === 'landscape' ? 'btn-active' : ''}"
                            on:click={() => formatOptions.orientation = 'landscape'}
                          >가로</button>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="text-sm">단:</label>
                        <select class="select select-xs select-bordered" bind:value={formatOptions.columns}>
                          <option value={1}>1단</option>
                          <option value={2}>2단</option>
                        </select>
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="text-sm">글자:</label>
                        <select class="select select-xs select-bordered" bind:value={formatOptions.fontSize}>
                          <option value="small">작게</option>
                          <option value="medium">보통</option>
                          <option value="large">크게</option>
                        </select>
                      </div>
                      <div class="flex items-center gap-2">
                        <label class="text-sm">간격:</label>
                        <select class="select select-xs select-bordered" bind:value={formatOptions.questionSpacing}>
                          <option value="narrow">좁게</option>
                          <option value="normal">보통</option>
                          <option value="wide">넓게</option>
                        </select>
                      </div>
                      <label class="label cursor-pointer gap-2">
                        <input type="checkbox" class="checkbox checkbox-xs" bind:checked={formatOptions.showSources} />
                        <span class="text-sm">출처</span>
                      </label>
                    </div>
                  </div>
                {/if}
                <!-- Canvas Preview -->
                <div class="flex-1 overflow-hidden">
                  {#if isBrowser && canvasReady && MaterialCanvasPreview}
                    <svelte:component 
                      this={MaterialCanvasPreview}
                      bind:this={canvasPreview}
                      blocks={materialData.content}
                      formatOptions={formatOptions}
                      testInfo={{
                        title: materialData.title,
                        subject: materialData.subject,
                        grade: materialData.grade,
                        date: new Date().toLocaleDateString('ko-KR'),
                        instructions: '※ 문제를 잘 읽고 답안을 작성하시오.'
                      }}
                      pageSize={formatOptions.pageSize}
                      showGrid={formatOptions.showGrid}
                      orientation={formatOptions.orientation}
                      selectedTool={selectedTool}
                      selectedShape={selectedShape}
                      on:contentChange={(e) => materialData.content = e.detail}
                      on:selection={(e) => selectedObject = e.detail.object}
                    />
                  {:else}
                    <div class="flex items-center justify-center h-full">
                      <div class="text-center">
                        <div class="loading loading-spinner loading-lg"></div>
                        <p class="mt-2">미리보기 로딩 중...</p>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
          
              <!-- Right Side Panel - Block List -->
              {#if showBlockList}
                <div class="w-80 bg-base-100 rounded-lg shadow-lg overflow-hidden flex flex-col">
                  <div class="p-4 bg-base-200 border-b">
                    <div class="flex items-center justify-between">
                      <h3 class="font-semibold">블록 리스트</h3>
                      <button class="btn btn-primary btn-sm" on:click={addContentElement}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        추가
                      </button>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto p-4 space-y-3">
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
                      {:else if element.type === 'text'}
                        <textarea placeholder="텍스트를 입력하세요" 
                                  class="textarea textarea-bordered w-full"
                                  rows="3"
                                  bind:value={element.content}></textarea>
                      {:else if element.type === 'question'}
                        {#if element.config}
                          <!-- 문항 번호/제목 표시 -->
                          <div class="mb-2 font-medium text-sm">
                            {element.title || `문항 ${element.config.questionNumber || index + 1}`}
                          </div>
                          {#if element.config.imageUrl}
                            <div class="mb-2">
                              <img src={element.config.imageUrl} alt="문항 이미지" class="max-w-full h-auto rounded-lg border border-base-300 bg-white" />
                            </div>
                          {:else}
                            <div class="alert alert-warning mb-2">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                              </svg>
                              <span>문항 이미지가 없습니다.</span>
                            </div>
                          {/if}
                          {#if element.config.options && element.config.options.length > 0}
                            <div class="mt-2 space-y-1">
                              {#each element.config.options as option, i}
                                <div class="text-sm">
                                  <span class="font-medium">{i + 1})</span> {option}
                                </div>
                              {/each}
                            </div>
                          {/if}
                          <div class="mt-2 text-sm">
                            <span class="badge badge-outline badge-sm mr-2">{getContentTypeLabel(element.config.questionType)}</span>
                            <span class="badge badge-outline badge-sm mr-2">{getDifficultyLabel(element.config.difficulty)}</span>
                            {#if element.config.correctAnswer}
                              <span class="text-base-content/70">정답: {element.config.correctAnswer}</span>
                            {/if}
                          </div>
                          {#if element.config.explanation}
                            <div class="mt-2 text-sm text-base-content/70">
                              <span class="font-medium">해설:</span> {element.config.explanation}
                            </div>
                          {/if}
                          {#if element.config.materialTitle}
                            <div class="mt-1 text-xs text-base-content/50">
                              출처: {element.config.materialTitle}
                            </div>
                          {/if}
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
                </div>
              {/if}
              
              <!-- Right Side Panel - Properties -->
              {#if showPropertiesPanel && selectedObject}
                <div class="w-80 bg-base-100 rounded-lg shadow-lg overflow-hidden flex flex-col">
                  <div class="p-4 bg-base-200 border-b">
                    <div class="flex items-center justify-between">
                      <h3 class="font-semibold">속성</h3>
                      <button class="btn btn-ghost btn-xs" on:click={() => showPropertiesPanel = false}>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div class="flex-1 overflow-y-auto p-4 space-y-4">
                    <!-- Text Properties -->
                    {#if selectedObject.type === 'textbox' || selectedObject.type === 'i-text'}
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">폰트 크기</span>
                        </label>
                        <input 
                          type="number" 
                          class="input input-bordered input-sm"
                          value={selectedObject.fontSize}
                          on:change={(e) => {
                            selectedObject.set('fontSize', parseInt(e.target.value));
                            canvasPreview?.canvas?.renderAll();
                          }}
                        />
                      </div>
                      
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">텍스트 색상</span>
                        </label>
                        <input 
                          type="color" 
                          class="input input-bordered input-sm h-10"
                          value={selectedObject.fill}
                          on:change={(e) => {
                            selectedObject.set('fill', e.target.value);
                            canvasPreview?.canvas?.renderAll();
                          }}
                        />
                      </div>
                      
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">정렬</span>
                        </label>
                        <div class="btn-group btn-group-sm">
                          <button 
                            class="btn {selectedObject.textAlign === 'left' ? 'btn-active' : ''}"
                            on:click={() => {
                              selectedObject.set('textAlign', 'left');
                              canvasPreview?.canvas?.renderAll();
                            }}
                          >왼쪽</button>
                          <button 
                            class="btn {selectedObject.textAlign === 'center' ? 'btn-active' : ''}"
                            on:click={() => {
                              selectedObject.set('textAlign', 'center');
                              canvasPreview?.canvas?.renderAll();
                            }}
                          >가운데</button>
                          <button 
                            class="btn {selectedObject.textAlign === 'right' ? 'btn-active' : ''}"
                            on:click={() => {
                              selectedObject.set('textAlign', 'right');
                              canvasPreview?.canvas?.renderAll();
                            }}
                          >오른쪽</button>
                        </div>
                      </div>
                    {/if}
                    
                    <!-- Shape Properties -->
                    {#if selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'triangle' || selectedObject.type === 'polygon'}
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">채우기 색상</span>
                        </label>
                        <input 
                          type="color" 
                          class="input input-bordered input-sm h-10"
                          value={selectedObject.fill || '#000000'}
                          on:change={(e) => {
                            selectedObject.set('fill', e.target.value);
                            canvasPreview?.canvas?.renderAll();
                          }}
                        />
                      </div>
                      
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">테두리 색상</span>
                        </label>
                        <input 
                          type="color" 
                          class="input input-bordered input-sm h-10"
                          value={selectedObject.stroke || '#000000'}
                          on:change={(e) => {
                            selectedObject.set('stroke', e.target.value);
                            canvasPreview?.canvas?.renderAll();
                          }}
                        />
                      </div>
                      
                      <div class="form-control">
                        <label class="label">
                          <span class="label-text">테두리 두께</span>
                        </label>
                        <input 
                          type="number" 
                          class="input input-bordered input-sm"
                          value={selectedObject.strokeWidth || 0}
                          on:change={(e) => {
                            selectedObject.set('strokeWidth', parseInt(e.target.value));
                            canvasPreview?.canvas?.renderAll();
                          }}
                        />
                      </div>
                    {/if}
                    
                    <!-- Common Properties -->
                    <div class="form-control">
                      <label class="label">
                        <span class="label-text">투명도</span>
                      </label>
                      <input 
                        type="range" 
                        class="range range-sm"
                        min="0"
                        max="100"
                        value={selectedObject.opacity * 100}
                        on:input={(e) => {
                          selectedObject.set('opacity', e.target.value / 100);
                          canvasPreview?.canvas?.renderAll();
                        }}
                      />
                      <div class="text-xs text-center mt-1">{Math.round(selectedObject.opacity * 100)}%</div>
                    </div>
                  </div>
                </div>
              {/if}
            </div>
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
                      disabled={currentStep === 1 && (!materialData.title || !materialData.subject || !materialData.grade || !selectedTemplateId)}
                      on:click={nextStep}>
                {fromQuestionBank && selectedQuestions.length === 0 ? '문제 선택하기' : '다음'}
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

<!-- Question Select Modal -->
<QuestionSelectModal 
  bind:showModal={showQuestionSelectModal}
  onSelect={handleQuestionsSelected}
  onCancel={() => showQuestionSelectModal = false}
/>