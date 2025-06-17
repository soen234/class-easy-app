<script>
  import { createEventDispatcher } from 'svelte';
  import EditorToolbar from './EditorToolbar.svelte';
  import QuestionSelector from './QuestionSelector.svelte';
  import { writable } from 'svelte/store';
  
  export let materialData;
  
  const dispatch = createEventDispatcher();
  
  const pages = writable([
    {
      id: 'page_1',
      questions: [],
      layout: 'auto'
    }
  ]);
  
  const selectedQuestions = writable([]);
  const editorSettings = writable({
    fontFamily: 'Noto Sans',
    fontSize: 14,
    questionsPerPage: 4,
    showAnswers: false,
    includeExplanations: true,
    colorMode: 'normal', // normal, white-text
    autoLayout: true
  });
  
  let showQuestionSelector = false;
  let currentPage = 0;
  
  function handleAddQuestions() {
    showQuestionSelector = true;
  }
  
  function handleQuestionsSelected(questions) {
    selectedQuestions.update(current => [...current, ...questions]);
    showQuestionSelector = false;
    
    // 자동 레이아웃 적용
    if ($editorSettings.autoLayout) {
      redistributeQuestions();
    }
  }
  
  function redistributeQuestions() {
    const allQuestions = $selectedQuestions;
    const questionsPerPage = $editorSettings.questionsPerPage;
    const newPages = [];
    
    for (let i = 0; i < allQuestions.length; i += questionsPerPage) {
      newPages.push({
        id: `page_${newPages.length + 1}`,
        questions: allQuestions.slice(i, i + questionsPerPage),
        layout: 'auto'
      });
    }
    
    if (newPages.length === 0) {
      newPages.push({
        id: 'page_1',
        questions: [],
        layout: 'auto'
      });
    }
    
    pages.set(newPages);
  }
  
  function handleSettingsChange(newSettings) {
    editorSettings.set(newSettings);
    if (newSettings.autoLayout) {
      redistributeQuestions();
    }
  }
  
  function handleSave() {
    const finalData = {
      ...materialData,
      pages: $pages,
      selectedQuestions: $selectedQuestions,
      settings: $editorSettings
    };
    
    dispatch('save', finalData);
  }
  
  function handleExport(format) {
    console.log(`내보내기: ${format}`);
    // PDF, 인쇄, 링크 공유 등
  }
  
  function addPage() {
    pages.update(current => [
      ...current,
      {
        id: `page_${current.length + 1}`,
        questions: [],
        layout: 'auto'
      }
    ]);
  }
  
  function removePage(pageIndex) {
    if ($pages.length > 1) {
      pages.update(current => current.filter((_, index) => index !== pageIndex));
    }
  }
</script>

<div class="flex h-screen bg-gray-50">
  <!-- 좌측 사이드바 -->
  <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
    <!-- 도구 모음 -->
    <EditorToolbar 
      settings={$editorSettings}
      on:settingsChange={(e) => handleSettingsChange(e.detail)}
      on:addQuestions={handleAddQuestions}
      on:export={(e) => handleExport(e.detail)}
    />
    
    <!-- 선택된 문항 목록 -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-gray-900">선택된 문항</h3>
          <span class="text-sm text-gray-500">{$selectedQuestions.length}개</span>
        </div>
        
        {#if $selectedQuestions.length === 0}
          <div class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <p class="text-sm">문항을 추가해주세요</p>
            <button 
              on:click={handleAddQuestions}
              class="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              문항 추가
            </button>
          </div>
        {:else}
          <div class="space-y-2">
            {#each $selectedQuestions as question, index}
              <div class="border border-gray-200 rounded p-3 bg-gray-50">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-900 mb-1">
                      {index + 1}. {question.title}
                    </div>
                    <div class="text-xs text-gray-500 truncate">
                      {question.content}
                    </div>
                    {#if question.answer}
                      <div class="text-xs text-blue-600 mt-1">
                        정답: {question.answer}
                      </div>
                    {/if}
                  </div>
                  <button class="text-red-500 hover:text-red-700 ml-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    
    <!-- 하단 액션 -->
    <div class="p-4 border-t border-gray-200 space-y-2">
      <button 
        on:click={handleSave}
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
      >
        저장하기
      </button>
      <div class="flex space-x-2">
        <button 
          on:click={() => handleExport('pdf')}
          class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          PDF 내보내기
        </button>
        <button 
          on:click={() => handleExport('print')}
          class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm"
        >
          인쇄
        </button>
      </div>
    </div>
  </div>
  
  <!-- 메인 편집 영역 -->
  <div class="flex-1 overflow-auto">
    <div class="p-8">
      <!-- 페이지 탭 -->
      <div class="flex items-center space-x-4 mb-6">
        <div class="flex space-x-2">
          {#each $pages as page, index}
            <button
              on:click={() => currentPage = index}
              class="px-3 py-2 rounded-lg border text-sm
                     {currentPage === index ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}"
            >
              페이지 {index + 1}
            </button>
          {/each}
        </div>
        
        <button 
          on:click={addPage}
          class="px-3 py-2 rounded-lg border border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"
        >
          + 페이지 추가
        </button>
        
        {#if $pages.length > 1}
          <button 
            on:click={() => removePage(currentPage)}
            class="px-3 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-sm"
          >
            현재 페이지 삭제
          </button>
        {/if}
      </div>
      
      <!-- 페이지 미리보기 -->
      <div class="max-w-2xl mx-auto">
        <div 
          class="bg-white shadow-lg rounded-lg overflow-hidden"
          style="aspect-ratio: {materialData.orientation === 'vertical' ? '210/297' : '297/210'};"
        >
          <div class="p-8 h-full {$editorSettings.colorMode === 'white-text' ? 'bg-black text-white' : 'bg-white text-black'}"
               style="font-family: {$editorSettings.fontFamily}; font-size: {$editorSettings.fontSize}px;">
            
            <!-- 페이지 헤더 -->
            <div class="text-center mb-6">
              <h1 class="text-2xl font-bold mb-2">{materialData.title || '제목 없음'}</h1>
              <div class="text-sm opacity-70">
                페이지 {currentPage + 1} / {$pages.length}
              </div>
            </div>
            
            <!-- 문항들 -->
            {#if $pages[currentPage] && $pages[currentPage].questions.length > 0}
              <div class="space-y-6">
                {#each $pages[currentPage].questions as question, qIndex}
                  <div class="border-b border-gray-200 pb-4 last:border-b-0">
                    <div class="font-semibold mb-2">
                      {qIndex + 1}. {question.content}
                    </div>
                    
                    {#if question.questionType === 'multipleChoice' && question.choices}
                      <div class="ml-4 space-y-1">
                        {#each question.choices as choice, cIndex}
                          <div class="text-sm">
                            ① {choice}
                          </div>
                        {/each}
                      </div>
                    {/if}
                    
                    {#if $editorSettings.showAnswers && question.answer}
                      <div class="mt-2 text-sm text-blue-600 font-medium">
                        정답: {question.answer}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center text-gray-400 mt-20">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p>이 페이지에 문항이 없습니다</p>
                <p class="text-sm mt-1">좌측에서 문항을 추가해주세요</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- 문항 선택 모달 -->
{#if showQuestionSelector}
  <QuestionSelector 
    on:select={(e) => handleQuestionsSelected(e.detail)}
    on:close={() => showQuestionSelector = false}
  />
{/if}