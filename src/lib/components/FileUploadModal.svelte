<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { saveFile } from '$lib/utils/fileStorage.js';
  import { supabase } from '$lib/supabase.js';
  
  export let isOpen = false;
  export let currentFolderId = null;
  export let currentPath = '/';
  
  const dispatch = createEventDispatcher();
  
  let files = [];
  let uploadProgress = {};
  let uploading = false;
  let isDragging = false;
  let dropzone;
  
  // 파일 선택 처리
  function handleFileSelect(event) {
    const selectedFiles = Array.from(event.target.files);
    addFiles(selectedFiles);
  }
  
  // 파일 추가
  function addFiles(newFiles) {
    const validFiles = newFiles.filter(file => {
      // PDF, 이미지, 텍스트 파일만 허용
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: 지원하지 않는 파일 형식입니다.`);
        return false;
      }
      
      // 100MB 제한
      if (file.size > 100 * 1024 * 1024) {
        alert(`${file.name}: 파일 크기가 100MB를 초과합니다.`);
        return false;
      }
      
      return true;
    });
    
    files = [...files, ...validFiles];
  }
  
  // 파일 제거
  function removeFile(index) {
    files = files.filter((_, i) => i !== index);
  }
  
  // 드래그 앤 드롭 처리
  function handleDragOver(e) {
    e.preventDefault();
    isDragging = true;
  }
  
  function handleDragLeave(e) {
    if (!dropzone.contains(e.relatedTarget)) {
      isDragging = false;
    }
  }
  
  function handleDrop(e) {
    e.preventDefault();
    isDragging = false;
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }
  
  // 파일 업로드
  async function uploadFiles() {
    if (files.length === 0) return;
    
    uploading = true;
    uploadProgress = {};
    
    const uploadPromises = files.map(async (file, index) => {
      uploadProgress[index] = 0;
      
      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folder_id', currentFolderId);
      }
      
      try {
        const xhr = new XMLHttpRequest();
        
        // Progress 이벤트 리스너
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            uploadProgress[index] = Math.round((e.loaded / e.total) * 100);
          }
        });
        
        // Promise로 감싸기
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          };
          
          xhr.onerror = () => reject(new Error('Network error'));
        });
        
        xhr.open('POST', '/api/materials');
        // Get the actual access token from Supabase
        const session = await supabase.auth.getSession();
        if (session?.data?.session?.access_token) {
          xhr.setRequestHeader('Authorization', `Bearer ${session.data.session.access_token}`);
        }
        xhr.send(formData);
        
        const result = await uploadPromise;
        uploadProgress[index] = 100;
        
        // 개발 모드에서만 파일 데이터를 IndexedDB에 저장
        if (result.fileData) {
          try {
            // IndexedDB에 파일 저장 (큰 용량 지원)
            await saveFile(result.data.id, result.fileData);
            
            // materials 목록은 localStorage에 저장 (작은 메타데이터만)
            const savedMaterials = localStorage.getItem('materials') || '[]';
            const materials = JSON.parse(savedMaterials);
            materials.unshift(result.data);
            
            // materials도 100개로 제한
            if (materials.length > 100) {
              materials.length = 100;
            }
            
            localStorage.setItem('materials', JSON.stringify(materials));
          } catch (e) {
            console.error('파일 저장 오류:', e);
          }
        }
        
        // Supabase를 사용하는 경우 materials store 업데이트
        if (!result.fileData && result.data) {
          // materials store를 새로고침
          const { fetchMaterials } = await import('$lib/stores/materials.js');
          await fetchMaterials($user.id, 'original');
        }
        
        return { success: true, file: file.name, data: result.data };
        
      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error);
        return { success: false, file: file.name, error: error.message };
      }
    });
    
    const results = await Promise.all(uploadPromises);
    
    // 성공한 파일들 처리
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      dispatch('upload', { 
        results, 
        successCount, 
        failCount 
      });
    }
    
    if (failCount > 0) {
      const failedFiles = results.filter(r => !r.success).map(r => r.file).join(', ');
      alert(`다음 파일 업로드에 실패했습니다: ${failedFiles}`);
    }
    
    // 모든 파일이 성공적으로 업로드되면 모달 닫기
    if (failCount === 0) {
      handleClose();
    } else {
      // 실패한 파일만 남기기
      const failedIndices = results
        .map((r, i) => !r.success ? i : -1)
        .filter(i => i !== -1);
      files = files.filter((_, i) => failedIndices.includes(i));
      uploading = false;
    }
  }
  
  function handleClose() {
    if (!uploading) {
      dispatch('close');
      resetForm();
    }
  }
  
  function resetForm() {
    files = [];
    uploadProgress = {};
    uploading = false;
    isDragging = false;
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('word')) return '📝';
    return '📎';
  }
</script>

{#if isOpen}
  <!-- 모달 백드롭 -->
  <div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    on:click={handleClose}
  >
    <!-- 모달 컨텐츠 -->
    <div 
      class="bg-base-100 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      on:click|stopPropagation
    >
      <!-- 헤더 -->
      <div class="flex items-center justify-between p-6 pb-4 border-b">
        <h3 class="text-lg font-bold">자료 업로드</h3>
        <button 
          class="btn btn-ghost btn-sm btn-circle"
          on:click={handleClose}
          disabled={uploading}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <!-- 바디 -->
      <div class="flex-1 overflow-y-auto p-6">
        <!-- 업로드 위치 표시 -->
        <div class="mb-4 text-sm text-base-content/70">
          <span>업로드 위치: </span>
          <span class="font-medium">
            📁 {currentPath}
          </span>
        </div>
        
        <!-- 드래그 앤 드롭 영역 -->
        <div
          bind:this={dropzone}
          class="relative border-2 border-dashed rounded-lg p-8 text-center transition-all
                 {isDragging ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary'}"
          on:dragover={handleDragOver}
          on:dragleave={handleDragLeave}
          on:drop={handleDrop}
        >
          {#if files.length === 0}
            <svg class="w-12 h-12 mx-auto mb-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-lg mb-2">파일을 드래그하여 놓거나 클릭하여 선택하세요</p>
            <p class="text-sm text-base-content/50 mb-4">PDF, 이미지, 문서 파일 (최대 100MB)</p>
          {:else}
            <p class="text-lg mb-2">{files.length}개 파일 선택됨</p>
            <p class="text-sm text-base-content/50 mb-4">추가 파일을 드래그하여 놓을 수 있습니다</p>
          {/if}
          
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx"
            class="absolute inset-0 opacity-0 cursor-pointer"
            on:change={handleFileSelect}
            disabled={uploading}
          />
          
          <button class="btn btn-primary" disabled={uploading}>
            파일 선택
          </button>
        </div>
        
        <!-- 선택된 파일 목록 -->
        {#if files.length > 0}
          <div class="mt-6 space-y-2">
            <h4 class="font-medium mb-2">선택된 파일</h4>
            {#each files as file, index}
              <div class="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                <div class="flex items-center gap-3 flex-1">
                  <span class="text-2xl">{getFileIcon(file.type)}</span>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate">{file.name}</p>
                    <p class="text-xs text-base-content/70">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                {#if uploadProgress[index] !== undefined}
                  <div class="w-32">
                    <div class="flex items-center gap-2">
                      <progress 
                        class="progress progress-primary w-full" 
                        value={uploadProgress[index]} 
                        max="100"
                      ></progress>
                      <span class="text-xs">{uploadProgress[index]}%</span>
                    </div>
                  </div>
                {:else if !uploading}
                  <button 
                    class="btn btn-ghost btn-sm btn-circle"
                    on:click={() => removeFile(index)}
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- 푸터 -->
      <div class="flex justify-between items-center gap-4 p-6 pt-4 border-t">
        <div class="text-sm text-base-content/50">
          {#if files.length > 0}
            총 {files.length}개 파일, {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
          {/if}
        </div>
        <div class="flex gap-2">
          <button 
            class="btn btn-ghost"
            on:click={handleClose}
            disabled={uploading}
          >
            취소
          </button>
          <button 
            class="btn btn-primary"
            on:click={uploadFiles}
            disabled={files.length === 0 || uploading}
          >
            {#if uploading}
              <span class="loading loading-spinner loading-sm"></span>
              업로드 중...
            {:else}
              업로드
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* 모달 애니메이션 */
  .fixed {
    animation: fadeIn 0.2s ease-out;
  }
  
  .bg-base-100 {
    animation: slideUp 0.2s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>