<script>
  import { createEventDispatcher } from 'svelte';
  
  export let orientation = 'vertical';
  
  const dispatch = createEventDispatcher();
  
  const verticalTemplates = [
    {
      id: 'exam-standard',
      name: '표준 시험지',
      description: '일반적인 시험지 형태',
      preview: '/templates/exam-standard.png',
      features: ['문제 번호 자동 매기기', '답안 공간 포함', '채점란 포함']
    },
    {
      id: 'mock-exam',
      name: '모의고사',
      description: '대학수능 모의고사 형태',
      preview: '/templates/mock-exam.png',
      features: ['OMR 답안지 스타일', '선택형 문제 최적화', '시간 표시']
    },
    {
      id: 'worksheet',
      name: '워크시트',
      description: '학습 활동용 워크시트',
      preview: '/templates/worksheet.png',
      features: ['넓은 답안 공간', '단계별 풀이 공간', '메모 영역']
    },
    {
      id: 'quiz',
      name: '퀴즈',
      description: '간단한 퀴즈 형태',
      preview: '/templates/quiz.png',
      features: ['간결한 레이아웃', '즉석 채점 가능', '빠른 피드백']
    }
  ];
  
  const horizontalTemplates = [
    {
      id: 'presentation',
      name: '프레젠테이션',
      description: '수업용 프레젠테이션',
      preview: '/templates/presentation.png',
      features: ['큰 글자 크기', '시각적 강조', '슬라이드 네비게이션']
    },
    {
      id: 'blackboard',
      name: '칠판 스타일',
      description: '검정 배경의 칠판 느낌',
      preview: '/templates/blackboard.png',
      features: ['검정 배경', '흰색/분필 텍스트', '빔프로젝터 최적화']
    },
    {
      id: 'interactive',
      name: '인터랙티브',
      description: '상호작용 중심 레이아웃',
      preview: '/templates/interactive.png',
      features: ['문제-답변 구조', '단계별 공개', '참여 유도']
    },
    {
      id: 'visual',
      name: '비주얼 중심',
      description: '이미지와 그래프 중심',
      preview: '/templates/visual.png',
      features: ['이미지 최적화', '차트/그래프 영역', '시각적 설명']
    }
  ];
  
  $: templates = orientation === 'vertical' ? verticalTemplates : horizontalTemplates;
  
  function selectTemplate(template) {
    dispatch('select', template);
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="text-center mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-2">
      {orientation === 'vertical' ? '세로형' : '가로형'} 템플릿을 선택하세요
    </h2>
    <p class="text-gray-600">
      {orientation === 'vertical' ? '시험지와 워크시트에 적합한' : '프레젠테이션과 수업에 적합한'} 템플릿을 선택해주세요.
    </p>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {#each templates as template}
      <div 
        class="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow border-2 border-transparent hover:border-blue-500"
        on:click={() => selectTemplate(template)}
      >
        <!-- 템플릿 미리보기 -->
        <div class="aspect-w-4 aspect-h-3 bg-gray-200 flex items-center justify-center">
          {#if orientation === 'vertical'}
            <div class="w-16 h-20 bg-white border border-gray-300 rounded shadow-sm flex flex-col p-1">
              <div class="flex-1 space-y-1">
                <div class="h-1 bg-gray-300 rounded w-3/4"></div>
                <div class="h-1 bg-gray-300 rounded w-1/2"></div>
                <div class="h-1 bg-gray-300 rounded w-2/3"></div>
              </div>
              <div class="h-2 bg-gray-100 rounded mt-1"></div>
            </div>
          {:else}
            <div class="w-20 h-14 bg-white border border-gray-300 rounded shadow-sm flex flex-col p-1">
              <div class="h-2 bg-blue-200 rounded w-full mb-1"></div>
              <div class="flex-1 space-y-1">
                <div class="h-1 bg-gray-300 rounded w-3/4"></div>
                <div class="h-1 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          {/if}
        </div>
        
        <!-- 템플릿 정보 -->
        <div class="p-4">
          <h3 class="font-semibold text-gray-900 mb-1">{template.name}</h3>
          <p class="text-sm text-gray-600 mb-3">{template.description}</p>
          
          <!-- 기능 목록 -->
          <div class="space-y-1">
            {#each template.features as feature}
              <div class="flex items-center space-x-2 text-xs text-gray-500">
                <svg class="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>{feature}</span>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <!-- 사용자 정의 템플릿 -->
  <div class="mt-8 p-6 bg-white rounded-lg border-2 border-dashed border-gray-300 text-center">
    <div class="text-gray-400 mb-2">
      <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
      </svg>
    </div>
    <h3 class="text-lg font-medium text-gray-900 mb-2">사용자 정의 템플릿</h3>
    <p class="text-gray-600 mb-4">빈 템플릿으로 시작하여 원하는 대로 자료를 만들어보세요.</p>
    <button 
      on:click={() => selectTemplate({ id: 'custom', name: '사용자 정의', description: '빈 템플릿' })}
      class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
    >
      빈 템플릿으로 시작
    </button>
  </div>
</div>