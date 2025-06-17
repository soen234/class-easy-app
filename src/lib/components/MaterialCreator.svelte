<script>
  import TemplateSelector from './TemplateSelector.svelte';
  import MaterialEditor from './MaterialEditor.svelte';
  import { writable } from 'svelte/store';
  
  const creationStep = writable('orientation'); // orientation -> template -> editor
  const selectedOrientation = writable('vertical');
  const selectedTemplate = writable(null);
  const materialData = writable({
    title: '',
    orientation: 'vertical',
    template: null,
    pages: [],
    settings: {
      fontFamily: 'Noto Sans',
      fontSize: 14,
      questionsPerPage: 4,
      showAnswers: false,
      includeExplanations: true
    }
  });
  
  let currentStep = 'orientation';
  
  function handleOrientationSelect(orientation) {
    selectedOrientation.set(orientation);
    materialData.update(data => ({ ...data, orientation }));
    creationStep.set('template');
    currentStep = 'template';
  }
  
  function handleTemplateSelect(template) {
    selectedTemplate.set(template);
    materialData.update(data => ({ ...data, template }));
    creationStep.set('editor');
    currentStep = 'editor';
  }
  
  function handleBack() {
    if (currentStep === 'template') {
      creationStep.set('orientation');
      currentStep = 'orientation';
    } else if (currentStep === 'editor') {
      creationStep.set('template');
      currentStep = 'template';
    }
  }
  
  function handleSave(data) {
    console.log('자료 저장:', data);
    // 실제 저장 로직
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- 헤더 -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">자료 만들기</h1>
          <div class="flex items-center space-x-2 mt-2">
            <div class="flex items-center space-x-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                         {currentStep === 'orientation' ? 'bg-blue-600 text-white' : 
                          currentStep === 'template' || currentStep === 'editor' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}">
                1
              </div>
              <span class="text-sm {currentStep === 'orientation' ? 'text-blue-600 font-medium' : 'text-gray-600'}">
                방향 설정
              </span>
            </div>
            
            <div class="w-8 h-px bg-gray-300"></div>
            
            <div class="flex items-center space-x-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                         {currentStep === 'template' ? 'bg-blue-600 text-white' : 
                          currentStep === 'editor' ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}">
                2
              </div>
              <span class="text-sm {currentStep === 'template' ? 'text-blue-600 font-medium' : 'text-gray-600'}">
                템플릿 선택
              </span>
            </div>
            
            <div class="w-8 h-px bg-gray-300"></div>
            
            <div class="flex items-center space-x-1">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                         {currentStep === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}">
                3
              </div>
              <span class="text-sm {currentStep === 'editor' ? 'text-blue-600 font-medium' : 'text-gray-600'}">
                편집
              </span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          {#if currentStep !== 'orientation'}
            <button 
              on:click={handleBack}
              class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              이전
            </button>
          {/if}
          <button 
            class="text-gray-600 hover:text-gray-800"
            on:click={() => window.history.back()}
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 단계별 내용 -->
    {#if currentStep === 'orientation'}
      <!-- 1단계: 방향 선택 -->
      <div class="max-w-4xl mx-auto">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-semibold text-gray-900 mb-2">자료 방향을 선택하세요</h2>
          <p class="text-gray-600">용도에 맞는 자료 방향을 선택해주세요.</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- 세로형 -->
          <div 
            class="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
            on:click={() => handleOrientationSelect('vertical')}
          >
            <div class="text-center">
              <div class="w-24 h-32 bg-gray-200 rounded mx-auto mb-4 flex items-center justify-center">
                <svg class="w-12 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">세로형</h3>
              <p class="text-gray-600 mb-4">모의고사, 내신 시험지에 적합한 세로 방향 자료</p>
              <div class="text-sm text-gray-500">
                <div>• 모의고사 템플릿</div>
                <div>• 내신 시험지 템플릿</div>
                <div>• 워크시트 템플릿</div>
              </div>
            </div>
          </div>
          
          <!-- 가로형 -->
          <div 
            class="bg-white rounded-lg shadow-lg p-8 cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
            on:click={() => handleOrientationSelect('horizontal')}
          >
            <div class="text-center">
              <div class="w-32 h-24 bg-gray-200 rounded mx-auto mb-4 flex items-center justify-center">
                <svg class="w-16 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z"></path>
                </svg>
              </div>
              <h3 class="text-xl font-semibold text-gray-900 mb-2">가로형</h3>
              <p class="text-gray-600 mb-4">프레젠테이션, 수업용 슬라이드에 적합한 가로 방향 자료</p>
              <div class="text-sm text-gray-500">
                <div>• 프레젠테이션 템플릿</div>
                <div>• 칠판용 템플릿 (검정 배경)</div>
                <div>• 빔프로젝터용 템플릿</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    {:else if currentStep === 'template'}
      <!-- 2단계: 템플릿 선택 -->
      <TemplateSelector 
        orientation={$selectedOrientation}
        on:select={(e) => handleTemplateSelect(e.detail)}
      />
      
    {:else if currentStep === 'editor'}
      <!-- 3단계: 편집 -->
      <MaterialEditor 
        materialData={$materialData}
        on:save={(e) => handleSave(e.detail)}
      />
    {/if}
  </div>
</div>