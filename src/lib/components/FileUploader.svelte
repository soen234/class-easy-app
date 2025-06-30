<script>
  import { createEventDispatcher } from 'svelte';
  import { uploadFile } from '$lib/supabase.js';
  import { user } from '$lib/stores/auth.js';
  
  export let acceptedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
  export let maxSize = 50 * 1024 * 1024; // 50MB
  export let multiple = true;
  export let currentFolderId = null;
  
  const dispatch = createEventDispatcher();
  
  let isDragging = false;
  let uploadQueue = [];
  let uploadProgress = {};
  
  // 파일 검증
  function validateFile(file) {
    if (!acceptedTypes.includes(file.type)) {
      return { valid: false, error: `${file.name}: 지원하지 않는 파일 형식입니다.` };
    }
    
    if (file.size > maxSize) {
      return { valid: false, error: `${file.name}: 파일 크기가 너무 큽니다. (최대 ${maxSize / 1024 / 1024}MB)` };
    }
    
    return { valid: true };
  }
  
  // 파일 업로드
  async function uploadFileToServer(file) {
    const fileId = crypto.randomUUID();
    
    uploadQueue = [...uploadQueue, {
      id: fileId,
      file,
      status: 'uploading',
      progress: 0
    }];
    
    try {
      // FormData 생성
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }
      formData.append('metadata', JSON.stringify({
        uploadedFrom: 'FileUploader'
      }));
      
      // XHR로 업로드 (진행률 추적)
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          uploadProgress[fileId] = progress;
          updateQueueItem(fileId, { progress });
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          updateQueueItem(fileId, { 
            status: 'completed',
            progress: 100,
            result: response.data
          });
          dispatch('upload', { file, data: response.data });
        } else {
          const error = JSON.parse(xhr.responseText);
          throw new Error(error.error || 'Upload failed');
        }
      });
      
      xhr.addEventListener('error', () => {
        updateQueueItem(fileId, { 
          status: 'error',
          error: '업로드 실패'
        });
      });
      
      xhr.open('POST', '/api/materials');
      
      // 인증 헤더 추가
      const token = localStorage.getItem('sb-access-token');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
      
    } catch (error) {
      updateQueueItem(fileId, { 
        status: 'error',
        error: error.message
      });
    }
  }
  
  function updateQueueItem(id, updates) {
    uploadQueue = uploadQueue.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
  }
  
  // 드래그 이벤트 핸들러
  function handleDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }
  
  function handleDragLeave(e) {
    e.preventDefault();
    isDragging = false;
  }
  
  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }
  
  function handleFiles(files) {
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(validation.error);
      }
    });
    
    if (errors.length > 0) {
      dispatch('error', { errors });
    }
    
    validFiles.forEach(file => uploadFileToServer(file));
  }
  
  function removeFromQueue(id) {
    uploadQueue = uploadQueue.filter(item => item.id !== id);
    delete uploadProgress[id];
  }
  
  function retryUpload(item) {
    removeFromQueue(item.id);
    uploadFileToServer(item.file);
  }
</script>

<div class="space-y-4">
  <!-- 드롭존 -->
  <div
    class="relative border-2 border-dashed rounded-lg p-8 text-center transition-all
           {isDragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary'}"
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <input
      type="file"
      id="file-input-{crypto.randomUUID()}"
      class="hidden"
      {multiple}
      accept={acceptedTypes.join(',')}
      on:change={(e) => handleFiles(Array.from(e.target.files))}
    />
    
    <label for="file-input-{crypto.randomUUID()}" class="cursor-pointer">
      <div class="flex flex-col items-center">
        <svg class="w-12 h-12 text-base-content/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        
        <p class="text-lg font-medium mb-2">
          파일을 드래그하여 업로드하세요
        </p>
        
        <p class="text-sm text-base-content/60 mb-4">
          또는 <span class="text-primary font-medium">클릭하여 선택</span>
        </p>
        
        <p class="text-xs text-base-content/50">
          지원 형식: PDF, PNG, JPG (최대 {maxSize / 1024 / 1024}MB)
        </p>
      </div>
    </label>
    
    {#if isDragging}
      <div class="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center">
        <p class="text-lg font-medium">여기에 놓으세요</p>
      </div>
    {/if}
  </div>
  
  <!-- 업로드 큐 -->
  {#if uploadQueue.length > 0}
    <div class="space-y-2">
      <h3 class="font-medium">업로드 진행 상황</h3>
      
      {#each uploadQueue as item}
        <div class="card bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                {#if item.status === 'uploading'}
                  <div class="loading loading-spinner loading-sm"></div>
                {:else if item.status === 'completed'}
                  <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                {:else if item.status === 'error'}
                  <svg class="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                {/if}
                
                <div>
                  <p class="font-medium text-sm">{item.file.name}</p>
                  <p class="text-xs text-base-content/60">
                    {(item.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                {#if item.status === 'uploading'}
                  <progress class="progress progress-primary w-24" value={item.progress} max="100"></progress>
                  <span class="text-sm">{item.progress}%</span>
                {:else if item.status === 'error'}
                  <span class="text-sm text-error mr-2">{item.error}</span>
                  <button 
                    class="btn btn-ghost btn-xs"
                    on:click={() => retryUpload(item)}
                  >
                    재시도
                  </button>
                {/if}
                
                <button 
                  class="btn btn-ghost btn-xs btn-circle"
                  on:click={() => removeFromQueue(item.id)}
                  disabled={item.status === 'uploading'}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>