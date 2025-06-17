<script>
  import { createEventDispatcher } from 'svelte';
  
  export let blocks = [];
  
  const dispatch = createEventDispatcher();
  
  let editingBlocks = [...blocks];
  
  function handleBlockUpdate(index, field, value) {
    editingBlocks[index] = {
      ...editingBlocks[index],
      [field]: value
    };
  }
  
  function handleSave() {
    dispatch('save', editingBlocks);
  }
  
  function handleBack() {
    dispatch('back');
  }
  
  function getBlockTypeLabel(type) {
    switch(type) {
      case 'problem': return '문제';
      case 'explanation': return '해설';
      case 'passage': return '지문';
      case 'concept': return '개념';
      default: return type;
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="mb-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-2">추출된 블록 편집</h2>
    <p class="text-gray-600">각 블록의 정보를 입력하고 문항 간 연결을 설정하세요.</p>
  </div>
  
  <div class="space-y-6">
    {#each editingBlocks as block, index}
      <div class="bg-white rounded-lg border border-gray-200 p-6">
        <div class="mb-4">
          <h3 class="font-medium text-gray-900 mb-2">
            블록 {index + 1} - {getBlockTypeLabel(block.type)}
          </h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 좌측: 블록 정보 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">블록 타입</label>
              <select 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={block.type}
                on:change={(e) => handleBlockUpdate(index, 'type', e.target.value)}
              >
                <option value="problem">문제</option>
                <option value="explanation">해설</option>
                <option value="passage">지문</option>
                <option value="concept">개념</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">제목</label>
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={block.title || `${getBlockTypeLabel(block.type)} ${index + 1}`}
                on:input={(e) => handleBlockUpdate(index, 'title', e.target.value)}
              />
            </div>
            
            {#if block.type === 'problem'}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">문항 형식</label>
                <select 
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={block.questionType || 'multipleChoice'}
                  on:change={(e) => handleBlockUpdate(index, 'questionType', e.target.value)}
                >
                  <option value="ox">OX</option>
                  <option value="multipleChoice">객관식</option>
                  <option value="subjective">주관식</option>
                  <option value="essay">서술형</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">정답</label>
                <input
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="정답을 입력하세요"
                  value={block.answer || ''}
                  on:input={(e) => handleBlockUpdate(index, 'answer', e.target.value)}
                />
              </div>
            {/if}
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">태그</label>
              <input
                type="text"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="태그를 쉼표로 구분하여 입력하세요"
                value={block.tags ? block.tags.join(', ') : ''}
                on:input={(e) => handleBlockUpdate(index, 'tags', e.target.value.split(',').map(t => t.trim()).filter(t => t))}
              />
              <div class="mt-2 flex flex-wrap gap-2">
                <button class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">난이도 높음</button>
                <button class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">난이도 중간</button>
                <button class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">난이도 낮음</button>
              </div>
            </div>
            
            {#if block.type === 'explanation' || block.type === 'passage'}
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">연결된 문항</label>
                <select 
                  multiple
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {#each editingBlocks.filter(b => b.type === 'problem') as problemBlock, pIndex}
                    <option value={problemBlock.id}>
                      문제 {pIndex + 1}: {problemBlock.title || problemBlock.content?.substring(0, 30) + '...'}
                    </option>
                  {/each}
                </select>
                <p class="text-xs text-gray-500 mt-1">Ctrl+클릭으로 여러 문항을 선택할 수 있습니다</p>
              </div>
            {/if}
          </div>
          
          <!-- 우측: 블록 내용 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">내용</label>
            <textarea
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-64 resize-none"
              placeholder="블록 내용을 입력하세요"
              value={block.content || ''}
              on:input={(e) => handleBlockUpdate(index, 'content', e.target.value)}
            ></textarea>
            
            <!-- LaTeX 수식 입력 도구 -->
            <div class="mt-2 flex space-x-2">
              <button class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
                수식 입력
              </button>
              <button class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200">
                이미지 삽입
              </button>
            </div>
          </div>
        </div>
      </div>
    {/each}
  </div>
  
  <!-- 하단 액션 버튼 -->
  <div class="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
    <button 
      on:click={handleBack}
      class="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      이전 단계
    </button>
    
    <div class="flex space-x-3">
      <button class="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
        임시 저장
      </button>
      <button 
        on:click={handleSave}
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        최종 저장
      </button>
    </div>
  </div>
</div>