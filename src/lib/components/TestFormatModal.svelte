<script>
  import { createEventDispatcher } from 'svelte';
  import { goto } from '$app/navigation';
  
  export let showModal = false;
  export let selectedQuestions = [];
  
  const dispatch = createEventDispatcher();
  
  function handleCancel() {
    showModal = false;
    dispatch('cancel');
  }
  
  function handleCreate() {
    // 선택된 문항만 localStorage에 저장
    localStorage.setItem('selectedQuestions', JSON.stringify(selectedQuestions));
    
    // 자료 생성 페이지로 이동 (문제은행에서 왔음을 표시)
    goto('/create-material?from=question-bank');
    
    showModal = false;
    dispatch('create');
  }
</script>

{#if showModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">선택한 문항으로 자료 만들기</h3>
      
      <div class="space-y-4">
        <!-- 선택된 문항 요약 -->
        <div class="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 class="font-bold">{selectedQuestions.length}개의 문항이 선택되었습니다</h3>
            <div class="text-sm mt-1">선택한 문항들로 새로운 학습 자료를 만들 수 있습니다.</div>
          </div>
        </div>
        
        <!-- 선택된 문항 미리보기 -->
        <div class="max-h-64 overflow-y-auto space-y-2">
          {#each selectedQuestions.slice(0, 5) as question, index}
            <div class="p-3 bg-base-200 rounded-lg">
              <div class="flex items-start gap-2">
                <span class="font-medium">{index + 1}.</span>
                <div class="flex-1">
                  <p class="text-sm line-clamp-2">{question.content || question.question}</p>
                  <div class="flex gap-2 mt-1">
                    <span class="badge badge-xs">{question.subtype || question.type}</span>
                    <span class="badge badge-xs">{question.difficulty}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
          {#if selectedQuestions.length > 5}
            <div class="text-center text-sm text-base-content/70">
              ... 외 {selectedQuestions.length - 5}개 문항
            </div>
          {/if}
        </div>
        
        <div class="alert">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <span class="text-sm">자료 만들기 페이지에서 템플릿을 선택하고 상세 설정을 할 수 있습니다.</span>
        </div>
      </div>
      
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={handleCancel}>취소</button>
        <button class="btn btn-primary" on:click={handleCreate}>
          자료 만들기 페이지로 이동
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={handleCancel}></div>
  </div>
{/if}