<script>
  import ExtractorPreview from './ExtractorPreview.svelte';
  import ExtractorToolbar from './ExtractorToolbar.svelte';
  import ExtractedBlocks from './ExtractedBlocks.svelte';
  import BlockEditor from './BlockEditor.svelte';
  import { writable } from 'svelte/store';
  
  export let material;
  
  const extractedBlocks = writable([]);
  const selectedBlocks = writable(new Set());
  const currentStep = writable(1); // 1: 추출, 2: 편집
  
  let autoExtractMode = false;
  let showBlockEditor = false;
  let editingBlock = null;
  
  function handleAutoExtract() {
    autoExtractMode = true;
    // 자동 문항 추출 로직
    const autoExtracted = [
      {
        id: 'block_1',
        type: 'problem',
        content: '다음 함수의 정의역을 구하시오.',
        position: { x: 100, y: 150, width: 400, height: 80 },
        page: 1
      },
      {
        id: 'block_2',
        type: 'problem',
        content: '다음 식을 간단히 하시오.',
        position: { x: 100, y: 250, width: 400, height: 60 },
        page: 1
      }
    ];
    extractedBlocks.set(autoExtracted);
  }
  
  function handleManualExtract(blockData) {
    extractedBlocks.update(blocks => [...blocks, blockData]);
  }
  
  function handleBlockSelect(blockId) {
    selectedBlocks.update(selected => {
      const newSelected = new Set(selected);
      if (newSelected.has(blockId)) {
        newSelected.delete(blockId);
      } else {
        newSelected.add(blockId);
      }
      return newSelected;
    });
  }
  
  function handleBlockEdit(block) {
    editingBlock = block;
    showBlockEditor = true;
  }
  
  function handleBlockSave(updatedBlock) {
    extractedBlocks.update(blocks => 
      blocks.map(block => block.id === updatedBlock.id ? updatedBlock : block)
    );
    showBlockEditor = false;
    editingBlock = null;
  }
  
  function handleExtract() {
    currentStep.set(2);
  }
  
  function handleFinalSave() {
    console.log('최종 저장:', $extractedBlocks);
    // 실제 저장 로직
  }
</script>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- 헤더 -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">문항 추출</h1>
          <p class="text-gray-600">{material?.title || '문서명'}</p>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-sm text-gray-500">
            단계 {$currentStep}/2
          </span>
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
    
    {#if $currentStep === 1}
      <!-- 1단계: 블록 추출 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- 좌측: 문서 미리보기 -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-lg shadow">
            <ExtractorToolbar 
              {autoExtractMode}
              on:autoExtract={handleAutoExtract}
              on:manualMode={() => autoExtractMode = false}
            />
            <ExtractorPreview 
              {material}
              {autoExtractMode}
              on:extract={handleManualExtract}
            />
          </div>
        </div>
        
        <!-- 우측: 추출된 블록 목록 -->
        <div class="lg:col-span-1">
          <ExtractedBlocks 
            blocks={$extractedBlocks}
            selectedBlocks={$selectedBlocks}
            on:select={(e) => handleBlockSelect(e.detail)}
            on:edit={(e) => handleBlockEdit(e.detail)}
            on:extract={handleExtract}
          />
        </div>
      </div>
    {:else}
      <!-- 2단계: 블록 편집 -->
      <BlockEditor 
        blocks={$extractedBlocks}
        on:save={handleFinalSave}
        on:back={() => currentStep.set(1)}
      />
    {/if}
  </div>
</div>

<!-- 블록 편집 모달 -->
{#if showBlockEditor && editingBlock}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">블록 편집</h3>
      <!-- 블록 편집 폼 -->
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">블록 타입</label>
          <select class="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option value="problem">문제</option>
            <option value="explanation">해설</option>
            <option value="passage">지문</option>
            <option value="concept">개념</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">내용</label>
          <textarea 
            class="w-full px-3 py-2 border border-gray-300 rounded-lg h-32"
            bind:value={editingBlock.content}
          ></textarea>
        </div>
        <div class="flex justify-end space-x-3">
          <button 
            on:click={() => showBlockEditor = false}
            class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button 
            on:click={() => handleBlockSave(editingBlock)}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}