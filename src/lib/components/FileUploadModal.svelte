<script>
  import { createEventDispatcher } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { saveFile } from '$lib/utils/fileStorage.js';
  import { supabase } from '$lib/supabase.js';
  import PdfThumbnailGenerator from './PdfThumbnailGenerator.svelte';
  
  export let isOpen = false;
  export let currentFolderId = null;
  export let currentPath = '/';
  
  const dispatch = createEventDispatcher();
  
  let files = [];
  let uploadProgress = {};
  let uploading = false;
  let isDragging = false;
  let dropzone;
  let thumbnailQueue = [];
  let showThumbnailGenerator = false;
  let currentThumbnailIndex = 0;
  let generateThumbnails = true;
  let uploadedCount = 0;
  let failedFiles = [];
  let fileStatuses = {}; // 파일별 상태 추적
  
  // 파일 선택 처리
  function handleFileSelect(event) {
    const selectedFiles = Array.from(event.target.files);
    addFiles(selectedFiles);
  }
  
  // 파일 추가
  function addFiles(newFiles) {
    const invalidFiles = [];
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
        invalidFiles.push(`${file.name}: 지원하지 않는 파일 형식`);
        return false;
      }
      
      // 100MB 제한
      if (file.size > 100 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: 100MB 초과`);
        return false;
      }
      
      return true;
    });
    
    if (invalidFiles.length > 0) {
      alert(invalidFiles.join('\n'));
    }
    
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
  
  // 배치로 파일 업로드 (동시 업로드 수 제한)
  async function uploadBatch(files, startIndex, batchSize = 3) {
    const batch = files.slice(startIndex, startIndex + batchSize);
    const promises = batch.map((file, idx) => uploadSingleFile(file, startIndex + idx));
    return Promise.all(promises);
  }

  // 단일 파일 업로드
  async function uploadSingleFile(file, index) {
    fileStatuses[index] = 'uploading';
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
        
      fileStatuses[index] = 'completed';
      uploadedCount++;
      return { success: true, file: file.name, data: result.data };
      
    } catch (error) {
      console.error(`Error uploading ${file.name}:`, error);
      fileStatuses[index] = 'failed';
      
      let errorMessage = error.message;
      if (error.message.includes('Row level security')) {
        errorMessage = '권한이 없습니다';
      } else if (error.message.includes('Network')) {
        errorMessage = '네트워크 오류';
      } else if (error.message.includes('timeout')) {
        errorMessage = '시간 초과';
      }
      
      failedFiles.push({ name: file.name, error: errorMessage });
      return { success: false, file: file.name, error: errorMessage };
    }
  }

  // 파일 업로드 메인 함수
  async function uploadFiles() {
    if (files.length === 0) return;
    
    uploading = true;
    uploadProgress = {};
    uploadedCount = 0;
    failedFiles = [];
    fileStatuses = {};
    
    // 파일 상태 초기화
    files.forEach((_, index) => {
      fileStatuses[index] = 'pending';
    });
    
    const results = [];
    const batchSize = 3; // 동시 업로드 수 제한
    
    // 배치로 순차 업로드
    for (let i = 0; i < files.length; i += batchSize) {
      const batchResults = await uploadBatch(files, i, batchSize);
      results.push(...batchResults);
    }
    
    // 성공한 파일들 처리
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    if (successCount > 0) {
      // PDF 파일들 찾기 (썸네일 생성 옵션이 켜져있을 때만)
      if (generateThumbnails) {
        const pdfResults = results.filter(r => 
          r.success && 
          r.data?.file_type === 'application/pdf' &&
          !r.data?.thumbnail_url
        );
        
        if (pdfResults.length > 0) {
          // PDF 썸네일 생성 큐에 추가
          thumbnailQueue = pdfResults.map(r => ({
            materialId: r.data.id,
            fileUrl: r.data.file_url || `${supabase.storage.from('materials-original').getPublicUrl(r.data.file_path).data.publicUrl}`,
            title: r.data.title
          }));
          currentThumbnailIndex = 0;
          showThumbnailGenerator = true;
          uploading = false;
        } else {
          dispatch('upload', { 
            results, 
            successCount, 
            failCount 
          });
          if (failCount === 0) {
            handleClose();
          }
        }
      } else {
        dispatch('upload', { 
          results, 
          successCount, 
          failCount 
        });
        if (failCount === 0) {
          handleClose();
        }
      }
    }
    
    uploading = false;
    
    if (failCount > 0 && successCount === 0) {
      alert('모든 파일 업로드에 실패했습니다.');
    } else if (failCount > 0) {
      // 실패한 파일 목록만 표시하고 모달은 열어둠
      const failed = results.filter(r => !r.success).map(r => r.file);
      if (failed.length <= 3) {
        alert(`다음 파일 업로드에 실패했습니다: ${failed.join(', ')}`);
      } else {
        alert(`${failed.length}개 파일 업로드에 실패했습니다.`);
      }
    }
    
    // 썸네일 생성이 필요 없고 모든 파일이 성공적으로 업로드되면 모달 닫기
    if (failCount === 0 && !showThumbnailGenerator) {
      handleClose();
    } else if (!showThumbnailGenerator) {
      // 실패한 파일만 남기기
      const failedIndices = results
        .map((r, i) => !r.success ? i : -1)
        .filter(i => i !== -1);
      files = files.filter((_, i) => failedIndices.includes(i));
      uploading = false;
    }
  }
  
  function handleClose() {
    if (!uploading || (uploading && confirm('업로드가 진행 중입니다. 정말 닫으시겠습니까?'))) {
      dispatch('close');
      resetForm();
    }
  }
  
  // 실패한 파일만 재시도
  function retryFailedFiles() {
    const failedIndices = [];
    Object.entries(fileStatuses).forEach(([index, status]) => {
      if (status === 'failed') {
        failedIndices.push(parseInt(index));
      }
    });
    
    // 실패한 파일만 남기고 재시도
    files = files.filter((_, i) => failedIndices.includes(i));
    uploadFiles();
  }
  
  function resetForm() {
    files = [];
    uploadProgress = {};
    uploading = false;
    isDragging = false;
    thumbnailQueue = [];
    showThumbnailGenerator = false;
    currentThumbnailIndex = 0;
    generateThumbnails = true;
    uploadedCount = 0;
    failedFiles = [];
    fileStatuses = {};
  }
  
  function handleThumbnailComplete(event) {
    currentThumbnailIndex++;
    
    // 모든 썸네일 생성 완료
    if (currentThumbnailIndex >= thumbnailQueue.length) {
      showThumbnailGenerator = false;
      dispatch('upload', { 
        results: [], 
        successCount: thumbnailQueue.length, 
        failCount: 0,
        thumbnailsGenerated: true
      });
      handleClose();
    }
  }
  
  function handleThumbnailError(error) {
    console.error('Thumbnail generation error:', error);
    // 에러가 나도 다음 파일 처리 진행
    handleThumbnailComplete();
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
                
                {#if fileStatuses[index]}
                  <div class="flex items-center gap-2">
                    {#if fileStatuses[index] === 'pending'}
                      <span class="text-sm text-base-content/50">대기중</span>
                    {:else if fileStatuses[index] === 'uploading'}
                      <div class="flex items-center gap-2">
                        <progress 
                          class="progress progress-primary w-20" 
                          value={uploadProgress[index]} 
                          max="100"
                        ></progress>
                        <span class="text-xs">{uploadProgress[index]}%</span>
                      </div>
                    {:else if fileStatuses[index] === 'completed'}
                      <span class="text-sm text-success flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        완료
                      </span>
                    {:else if fileStatuses[index] === 'failed'}
                      <span class="text-sm text-error flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                        실패
                      </span>
                    {/if}
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
        <div class="flex flex-col gap-1">
          <div class="text-sm text-base-content/50">
            {#if files.length > 0}
              총 {files.length}개 파일, {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
            {/if}
          </div>
          {#if uploading}
            <div class="text-sm font-medium">
              업로드 중: {uploadedCount} / {files.length} 완료
              {#if failedFiles.length > 0}
                <span class="text-error">({failedFiles.length}개 실패)</span>
              {/if}
            </div>
          {/if}
        </div>
        <div class="flex gap-2">
          {#if files.some(f => f.type === 'application/pdf')}
            <label class="flex items-center gap-2">
              <input 
                type="checkbox" 
                class="checkbox checkbox-sm"
                bind:checked={generateThumbnails}
                disabled={uploading}
              />
              <span class="text-sm">PDF 썸네일 생성</span>
            </label>
          {/if}
          <button 
            class="btn btn-ghost"
            on:click={handleClose}
            disabled={uploading}
          >
            {uploading ? '닫기' : '취소'}
          </button>
          {#if failedFiles.length > 0 && !uploading}
            <button 
              class="btn btn-warning btn-sm"
              on:click={retryFailedFiles}
            >
              실패한 파일 재시도
            </button>
          {/if}
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

<!-- 썸네일 생성 모달 -->
{#if showThumbnailGenerator && thumbnailQueue[currentThumbnailIndex]}
  <div class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 class="text-lg font-bold mb-4">PDF 썸네일 생성 중</h3>
      
      <div class="mb-4">
        <div class="text-sm text-base-content/70 mb-2">
          {currentThumbnailIndex + 1} / {thumbnailQueue.length} 파일 처리 중
        </div>
        <div class="text-sm font-medium">
          {thumbnailQueue[currentThumbnailIndex].title}
        </div>
      </div>
      
      <PdfThumbnailGenerator
        materialId={thumbnailQueue[currentThumbnailIndex].materialId}
        fileUrl={thumbnailQueue[currentThumbnailIndex].fileUrl}
        onComplete={handleThumbnailComplete}
        onError={handleThumbnailError}
      />
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