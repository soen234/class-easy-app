<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth.js';
  import { blocks, fetchBlocks } from '$lib/stores/blocks.js';
  import { materials, fetchMaterials } from '$lib/stores/materials.js';
  import { templates } from '$lib/stores/templates.js';
  
  let editorMode = 'document'; // 'document', 'question', 'template'
  let documentContent = '';
  let documentTitle = '새 문서';
  let selectedBlocks = [];
  let documentStructure = [
    { type: 'title', content: '시험지 제목', id: 'title-1' },
    { type: 'info', content: '시험 정보 (과목, 시간, 점수 등)', id: 'info-1' },
    { type: 'instructions', content: '문제 풀이 유의사항', id: 'instructions-1' },
    { type: 'questions', content: '문제 영역', id: 'questions-1' }
  ];
  
  let availableTemplates = [
    {
      id: 'exam-basic',
      name: '기본 시험지',
      description: '일반적인 시험지 형태',
      preview: '제목 + 문제 + 답안지'
    },
    {
      id: 'worksheet',
      name: '학습지',
      description: '연습용 학습지',
      preview: '개념 설명 + 예제 + 연습문제'
    },
    {
      id: 'quiz',
      name: '퀴즈',
      description: '간단한 퀴즈 형태',
      preview: '문제 + 즉석 답안'
    }
  ];
  
  let previewMode = false;
  
  onMount(() => {
    if ($user?.id) {
      fetchBlocks($user.id);
      fetchMaterials($user.id);
    }
    
    // Check if template ID is provided in URL
    const templateId = $page.url.searchParams.get('template');
    if (templateId) {
      const template = templates.getTemplateById(templateId);
      if (template) {
        documentTitle = `새 ${template.name}`;
        documentStructure = JSON.parse(JSON.stringify(template.structure || []));
      }
    }
  });
  
  function addElementToDocument(type) {
    const newElement = {
      type,
      content: getDefaultContent(type),
      id: `${type}-${Date.now()}`
    };
    documentStructure = [...documentStructure, newElement];
  }
  
  function getDefaultContent(type) {
    const defaults = {
      title: '새 제목',
      subtitle: '부제목',
      text: '텍스트를 입력하세요',
      question: '문제를 입력하세요',
      image: '이미지 영역',
      table: '표 영역',
      pagebreak: '페이지 나누기'
    };
    return defaults[type] || '새 요소';
  }
  
  function removeElement(id) {
    documentStructure = documentStructure.filter(el => el.id !== id);
  }
  
  function moveElement(id, direction) {
    const index = documentStructure.findIndex(el => el.id === id);
    if (direction === 'up' && index > 0) {
      [documentStructure[index], documentStructure[index - 1]] = [documentStructure[index - 1], documentStructure[index]];
    } else if (direction === 'down' && index < documentStructure.length - 1) {
      [documentStructure[index], documentStructure[index + 1]] = [documentStructure[index + 1], documentStructure[index]];
    }
    documentStructure = [...documentStructure];
  }
  
  function addQuestionToDocument(block) {
    const questionElement = {
      type: 'question-block',
      content: block.question,
      blockData: block,
      id: `question-${block.id}-${Date.now()}`
    };
    documentStructure = [...documentStructure, questionElement];
  }
  
  function saveDocument() {
    // 실제로는 서버에 저장
    console.log('문서 저장:', {
      title: documentTitle,
      content: documentStructure,
      type: editorMode
    });
    alert('문서가 저장되었습니다!');
  }
  
  function saveAsTemplate() {
    const templateName = prompt('템플릿 이름을 입력하세요:');
    if (!templateName) return;
    
    const newTemplate = {
      name: templateName,
      description: prompt('템플릿 설명을 입력하세요:') || '',
      category: 'custom',
      difficulty: 'medium',
      estimatedTime: '15분',
      features: [],
      tags: ['사용자정의'],
      structure: documentStructure.map(el => ({
        ...el,
        editable: true
      }))
    };
    
    templates.addCustomTemplate(newTemplate);
    templates.saveCustomTemplates();
    alert('템플릿이 저장되었습니다!');
  }
  
  function exportDocument(format) {
    // 실제로는 문서 변환 API 호출
    console.log(`${format} 형태로 내보내기:`, documentStructure);
    alert(`${format.toUpperCase()} 파일로 내보내기가 시작됩니다.`);
  }
  
  function getDifficultyLabel(difficulty) {
    const labels = { easy: '쉬움', medium: '보통', hard: '어려움' };
    return labels[difficulty] || difficulty;
  }
  
  function getQuestionTypeLabel(type) {
    const labels = {
      multiple_choice: '객관식',
      short_answer: '단답형',
      essay: '서술형',
      true_false: 'O/X'
    };
    return labels[type] || type;
  }
</script>

<svelte:head>
  <title>편집기 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">편집기</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        <li>편집기</li>
      </ul>
    </div>
  </div>

  <!-- 편집기 모드 선택 -->
  <div class="tabs tabs-boxed bg-base-200">
    <button 
      class="tab {editorMode === 'document' ? 'tab-active' : ''}"
      on:click={() => editorMode = 'document'}
    >
      📄 문서 편집
    </button>
    <button 
      class="tab {editorMode === 'question' ? 'tab-active' : ''}"
      on:click={() => editorMode = 'question'}
    >
      ❓ 문항 편집
    </button>
    <button 
      class="tab {editorMode === 'template' ? 'tab-active' : ''}"
      on:click={() => editorMode = 'template'}
    >
      📋 템플릿
    </button>
  </div>

  {#if editorMode === 'document'}
    <!-- 문서 편집 모드 -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- 도구 패널 -->
      <div class="lg:col-span-1">
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">요소 추가</h3>
            
            <div class="space-y-2">
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('title')}
              >
                <span class="mr-2">📝</span> 제목
              </button>
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('subtitle')}
              >
                <span class="mr-2">📄</span> 부제목
              </button>
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('text')}
              >
                <span class="mr-2">📝</span> 텍스트
              </button>
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('image')}
              >
                <span class="mr-2">🖼️</span> 이미지
              </button>
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('table')}
              >
                <span class="mr-2">📊</span> 표
              </button>
              <button 
                class="btn btn-outline btn-sm w-full justify-start"
                on:click={() => addElementToDocument('pagebreak')}
              >
                <span class="mr-2">📄</span> 페이지 나누기
              </button>
            </div>
            
            <div class="divider"></div>
            
            <h4 class="font-medium mb-2">문항 은행</h4>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              {#each $blocks as block}
                <div class="p-2 bg-base-200 rounded text-xs">
                  <p class="font-medium truncate">{block.question}</p>
                  <div class="flex gap-1 mt-1">
                    <span class="badge badge-xs badge-primary">
                      {getQuestionTypeLabel(block.type)}
                    </span>
                    <span class="badge badge-xs badge-outline">
                      {getDifficultyLabel(block.difficulty)}
                    </span>
                  </div>
                  <button 
                    class="btn btn-xs btn-primary mt-1 w-full"
                    on:click={() => addQuestionToDocument(block)}
                  >
                    추가
                  </button>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 편집 영역 -->
      <div class="lg:col-span-2">
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <div class="flex items-center justify-between mb-4">
              <input 
                type="text" 
                class="input input-ghost text-lg font-bold flex-1" 
                bind:value={documentTitle}
                placeholder="문서 제목"
              />
              <div class="flex gap-2">
                <button 
                  class="btn btn-outline btn-sm"
                  class:btn-active={previewMode}
                  on:click={() => previewMode = !previewMode}
                >
                  {previewMode ? '편집' : '미리보기'}
                </button>
              </div>
            </div>
            
            <div class="space-y-4 min-h-96">
              {#each documentStructure as element, index}
                <div class="group relative border border-base-300 rounded-lg p-4 hover:border-primary transition-colors">
                  <!-- 편집 컨트롤 -->
                  {#if !previewMode}
                    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div class="flex gap-1">
                        <button 
                          class="btn btn-xs btn-ghost"
                          on:click={() => moveElement(element.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button 
                          class="btn btn-xs btn-ghost"
                          on:click={() => moveElement(element.id, 'down')}
                          disabled={index === documentStructure.length - 1}
                        >
                          ↓
                        </button>
                        <button 
                          class="btn btn-xs btn-error"
                          on:click={() => removeElement(element.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  {/if}
                  
                  <!-- 요소 내용 -->
                  {#if element.type === 'title'}
                    {#if previewMode}
                      <h1 class="text-3xl font-bold text-center">{element.content}</h1>
                    {:else}
                      <input 
                        type="text" 
                        class="input input-ghost text-3xl font-bold text-center w-full" 
                        bind:value={element.content}
                        placeholder="제목을 입력하세요"
                      />
                    {/if}
                  {:else if element.type === 'subtitle'}
                    {#if previewMode}
                      <h2 class="text-xl font-medium text-center">{element.content}</h2>
                    {:else}
                      <input 
                        type="text" 
                        class="input input-ghost text-xl font-medium text-center w-full" 
                        bind:value={element.content}
                        placeholder="부제목을 입력하세요"
                      />
                    {/if}
                  {:else if element.type === 'text'}
                    {#if previewMode}
                      <p class="whitespace-pre-wrap">{element.content}</p>
                    {:else}
                      <textarea 
                        class="textarea textarea-ghost w-full h-24" 
                        bind:value={element.content}
                        placeholder="텍스트를 입력하세요"
                      ></textarea>
                    {/if}
                  {:else if element.type === 'question-block'}
                    <div class="bg-base-200 p-4 rounded">
                      <div class="flex gap-2 mb-2">
                        <span class="badge badge-primary badge-sm">
                          {getQuestionTypeLabel(element.blockData.type)}
                        </span>
                        <span class="badge badge-outline badge-sm">
                          {getDifficultyLabel(element.blockData.difficulty)}
                        </span>
                      </div>
                      <h3 class="font-medium mb-2">{element.blockData.question}</h3>
                      {#if element.blockData.options}
                        <div class="ml-4 space-y-1">
                          {#each element.blockData.options as option, i}
                            <div>
                              <span class="text-sm">{String.fromCharCode(97 + i)}) {option}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {:else if element.type === 'image'}
                    <div class="border-2 border-dashed border-base-300 p-8 text-center">
                      <svg class="w-12 h-12 mx-auto text-base-content/50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p class="text-base-content/70">이미지 영역</p>
                    </div>
                  {:else if element.type === 'pagebreak'}
                    <div class="border-t-2 border-dashed border-base-300 text-center py-2">
                      <span class="bg-base-100 px-4 text-sm text-base-content/70">페이지 나누기</span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>
      
      <!-- 설정 패널 -->
      <div class="lg:col-span-1">
        <div class="card bg-base-100 shadow">
          <div class="card-body">
            <h3 class="card-title text-lg mb-4">문서 설정</h3>
            
            <div class="space-y-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text">페이지 크기</span>
                </label>
                <select class="select select-bordered select-sm">
                  <option>A4</option>
                  <option>A3</option>
                  <option>B4</option>
                </select>
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">여백</span>
                </label>
                <select class="select select-bordered select-sm">
                  <option>보통</option>
                  <option>좁게</option>
                  <option>넓게</option>
                </select>
              </div>
              
              <div class="form-control">
                <label class="label">
                  <span class="label-text">글꼴 크기</span>
                </label>
                <select class="select select-bordered select-sm">
                  <option>12pt</option>
                  <option>14pt</option>
                  <option>16pt</option>
                </select>
              </div>
            </div>
            
            <div class="divider"></div>
            
            <div class="space-y-2">
              <button class="btn btn-primary w-full" on:click={saveDocument}>
                저장
              </button>
              <button class="btn btn-secondary w-full" on:click={saveAsTemplate}>
                템플릿으로 저장
              </button>
              <div class="dropdown dropdown-top w-full">
                <div tabindex="0" role="button" class="btn btn-outline w-full">내보내기</div>
                <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-full p-2 shadow">
                  <li><button on:click={() => exportDocument('pdf')}>PDF로 내보내기</button></li>
                  <li><button on:click={() => exportDocument('docx')}>Word로 내보내기</button></li>
                  <li><button on:click={() => exportDocument('html')}>HTML로 내보내기</button></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  {:else if editorMode === 'question'}
    <!-- 문항 편집 모드 -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title mb-4">문항 편집</h2>
        <div class="text-center py-12">
          <div class="text-4xl mb-4">🚧</div>
          <h3 class="text-lg font-medium mb-2">개발 중인 기능입니다</h3>
          <p class="text-base-content/70">
            문항 편집 기능은 곧 추가될 예정입니다
          </p>
        </div>
      </div>
    </div>
    
  {:else if editorMode === 'template'}
    <!-- 템플릿 모드 -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title mb-4">템플릿 선택</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each availableTemplates as template}
            <div class="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div class="card-body">
                <h3 class="card-title">{template.name}</h3>
                <p class="text-sm text-base-content/70 mb-2">{template.description}</p>
                <div class="bg-base-300 p-3 rounded text-xs">
                  <p class="font-mono">{template.preview}</p>
                </div>
                <div class="card-actions justify-end mt-4">
                  <button class="btn btn-primary btn-sm">선택</button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>