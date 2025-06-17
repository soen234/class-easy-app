<script>
  import QuestionCard from './QuestionCard.svelte';
  import { writable } from 'svelte/store';
  
  const questions = writable([
    {
      id: 1,
      title: '블랙라벨 수학(하) 3p 문제 1',
      type: 'problem',
      questionType: 'multipleChoice',
      answer: '②',
      createdAt: '2024-01-15',
      tags: ['난이도 중간', '함수'],
      content: '다음 함수의 정의역을 구하시오.',
      relatedItems: []
    },
    {
      id: 2,
      title: '블랙라벨 수학(하) 3p 해설 1',
      type: 'explanation',
      createdAt: '2024-01-15',
      tags: ['해설'],
      content: '이 문제는 함수의 정의역을 구하는 문제입니다...',
      relatedItems: [1]
    },
    {
      id: 3,
      title: '블랙라벨 수학(하) 2p 지문 1',
      type: 'passage',
      createdAt: '2024-01-15',
      tags: ['지문'],
      content: '다음 그래프를 보고 문제를 해결하시오.',
      relatedItems: [1]
    }
  ]);
  
  let filteredQuestions = [];
  let viewMode = 'card';
  let selectedItems = new Set();
  
  questions.subscribe(value => {
    filteredQuestions = value;
  });
  
  function handleUpload() {
    console.log('자료 올리기');
  }
  
  function handleCreate() {
    console.log('자료 만들기');
  }
  
  function handleQuestionAction(question, action) {
    console.log(`${action} for question:`, question);
  }
  
  function toggleSelection(questionId) {
    if (selectedItems.has(questionId)) {
      selectedItems.delete(questionId);
    } else {
      selectedItems.add(questionId);
    }
    selectedItems = selectedItems;
  }
  
  function handleBulkDelete() {
    console.log('일괄 삭제:', Array.from(selectedItems));
  }
</script>

<div class="space-y-4">
  <!-- 상단 액션 버튼 -->
  <div class="flex justify-between items-center">
    <div class="flex space-x-3">
      <button 
        on:click={handleUpload}
        class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>자료 올리기</span>
      </button>
      
      <button 
        on:click={handleCreate}
        class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        <span>자료 만들기</span>
      </button>
      
      {#if selectedItems.size > 0}
        <button 
          on:click={handleBulkDelete}
          class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <span>선택 항목 삭제 ({selectedItems.size})</span>
        </button>
      {/if}
    </div>
    
    <!-- 뷰 모드 토글 -->
    <div class="flex items-center space-x-2">
      <button 
        on:click={() => viewMode = 'card'}
        class="p-2 rounded {viewMode === 'card' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
      </button>
      <button 
        on:click={() => viewMode = 'list'}
        class="p-2 rounded {viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- 필터 섹션 -->
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex flex-wrap gap-4">
      <div class="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="문항 검색..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <select class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        <option value="all">전체 타입</option>
        <option value="problem">문제</option>
        <option value="explanation">해설</option>
        <option value="passage">지문</option>
        <option value="concept">개념</option>
      </select>
      <select class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        <option value="all">전체 난이도</option>
        <option value="high">높음</option>
        <option value="medium">중간</option>
        <option value="low">낮음</option>
      </select>
    </div>
  </div>
  
  <!-- 문항 목록 -->
  <div class="mt-6">
    {#if viewMode === 'card'}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredQuestions as question}
          <QuestionCard 
            {question} 
            selected={selectedItems.has(question.id)}
            on:select={() => toggleSelection(question.id)}
            on:action={(e) => handleQuestionAction(question, e.detail)} 
          />
        {/each}
      </div>
    {:else}
      <div class="bg-white rounded-lg shadow">
        <div class="px-6 py-4 border-b border-gray-200">
          <div class="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
            <div class="col-span-1">
              <input type="checkbox" class="rounded" />
            </div>
            <div class="col-span-4">제목</div>
            <div class="col-span-2">타입</div>
            <div class="col-span-2">생성일</div>
            <div class="col-span-2">태그</div>
            <div class="col-span-1">액션</div>
          </div>
        </div>
        <div class="divide-y divide-gray-200">
          {#each filteredQuestions as question}
            <div class="px-6 py-4 hover:bg-gray-50">
              <div class="grid grid-cols-12 gap-4 items-center">
                <div class="col-span-1">
                  <input 
                    type="checkbox" 
                    class="rounded" 
                    checked={selectedItems.has(question.id)}
                    on:change={() => toggleSelection(question.id)}
                  />
                </div>
                <div class="col-span-4">
                  <div class="font-medium text-gray-900">{question.title}</div>
                  <div class="text-sm text-gray-500 truncate">{question.content}</div>
                </div>
                <div class="col-span-2">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    {question.type === 'problem' ? 'bg-blue-100 text-blue-800' : 
                     question.type === 'explanation' ? 'bg-green-100 text-green-800' : 
                     question.type === 'passage' ? 'bg-yellow-100 text-yellow-800' : 
                     'bg-purple-100 text-purple-800'}">
                    {question.type === 'problem' ? '문제' : 
                     question.type === 'explanation' ? '해설' : 
                     question.type === 'passage' ? '지문' : '개념'}
                  </span>
                </div>
                <div class="col-span-2 text-sm text-gray-900">{question.createdAt}</div>
                <div class="col-span-2">
                  <div class="flex flex-wrap gap-1">
                    {#each question.tags.slice(0, 2) as tag}
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    {/each}
                    {#if question.tags.length > 2}
                      <span class="text-xs text-gray-500">+{question.tags.length - 2}</span>
                    {/if}
                  </div>
                </div>
                <div class="col-span-1">
                  <button class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>