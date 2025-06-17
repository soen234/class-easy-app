<script>
  import { user } from '$lib/stores/auth.js';
  import { addMaterial } from '$lib/stores/materials.js';
  import { goto } from '$app/navigation';
  
  let dragActive = false;
  let uploadedFiles = [];
  let uploading = false;

  function handleDragOver(e) {
    e.preventDefault();
    dragActive = true;
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragActive = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragActive = false;
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
  }

  function handleFiles(files) {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/jpeg', 'image/png', 'image/jpg'];
    
    files.forEach(file => {
      if (validTypes.includes(file.type)) {
        uploadedFiles = [...uploadedFiles, {
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending'
        }];
      }
    });
  }

  function removeFile(index) {
    uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function getFileTypeIcon(type) {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('powerpoint') || type.includes('presentation')) return '📊';
    if (type.includes('image')) return '🖼️';
    return '📎';
  }

  async function uploadFiles() {
    uploading = true;
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      uploadedFiles[i].status = 'uploading';
      
      try {
        // 실제 파일 업로드 (Supabase Storage는 나중에 구현)
        const file = uploadedFiles[i];
        
        // 메타데이터로 저장 (실제 파일은 더미)
        const materialData = {
          title: file.name,
          type: 'original',
          file_type: file.type,
          file_size: file.size,
          file_path: `dummy/${file.name}`,
          pages: Math.floor(Math.random() * 100) + 10, // 더미 페이지 수
        };
        
        const { data, error } = await addMaterial($user.id, materialData);
        
        if (error) {
          uploadedFiles[i].status = 'error';
          console.error('Upload error:', error);
        } else {
          uploadedFiles[i].status = 'completed';
        }
        
      } catch (error) {
        uploadedFiles[i].status = 'error';
        console.error('Upload error:', error);
      }
      
      // 업로드 시뮬레이션 지연
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    uploading = false;
    
    // 모든 업로드 완료 후 내 자료로 이동
    if (uploadedFiles.every(f => f.status === 'completed')) {
      setTimeout(() => {
        goto('/my-materials');
      }, 1000);
    }
  }
</script>

<svelte:head>
  <title>자료 올리기 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">자료 올리기</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        <li>자료 올리기</li>
      </ul>
    </div>
  </div>

  <!-- Upload Area -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <div 
        class="border-2 border-dashed rounded-lg p-12 text-center transition-colors
               {dragActive ? 'border-primary bg-primary/10' : 'border-base-300'}"
        on:dragover={handleDragOver}
        on:dragleave={handleDragLeave}
        on:drop={handleDrop}
        role="button"
        tabindex="0"
      >
        <div class="flex flex-col items-center space-y-4">
          <svg class="w-16 h-16 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <div>
            <p class="text-lg font-medium mb-2">파일을 드래그하여 업로드하거나</p>
            <label class="btn btn-primary">
              <input type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" class="hidden" on:change={handleFileSelect} />
              파일 선택
            </label>
          </div>
          <p class="text-sm text-base-content/70">PDF, DOC, PPT, JPG, PNG 파일을 지원합니다</p>
        </div>
      </div>
    </div>
  </div>

  <!-- File List -->
  {#if uploadedFiles.length > 0}
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <div class="flex items-center justify-between mb-4">
          <h2 class="card-title">업로드할 파일 ({uploadedFiles.length})</h2>
          <button 
            class="btn btn-primary"
            class:loading={uploading}
            disabled={uploading || uploadedFiles.every(f => f.status === 'completed')}
            on:click={uploadFiles}
          >
            {uploading ? '업로드 중...' : '업로드 시작'}
          </button>
        </div>
        
        <div class="space-y-3">
          {#each uploadedFiles as file, index}
            <div class="flex items-center space-x-4 p-4 bg-base-200 rounded-lg">
              <div class="text-2xl">{getFileTypeIcon(file.type)}</div>
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{file.name}</p>
                <p class="text-sm text-base-content/70">{formatFileSize(file.size)}</p>
              </div>
              <div class="flex items-center space-x-2">
                {#if file.status === 'pending'}
                  <div class="badge badge-ghost">대기중</div>
                {:else if file.status === 'uploading'}
                  <div class="badge badge-warning">업로드중</div>
                {:else if file.status === 'completed'}
                  <div class="badge badge-success">완료</div>
                {/if}
                
                {#if file.status === 'pending'}
                  <button class="btn btn-ghost btn-sm" on:click={() => removeFile(index)}>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Upload Tips -->
  <div class="alert alert-info">
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <div>
      <h3 class="font-bold">업로드 팁</h3>
      <div class="text-sm">
        • 한 번에 여러 파일을 업로드할 수 있습니다<br>
        • 업로드된 파일은 자동으로 문항 추출이 가능합니다<br>
        • 최대 파일 크기: 50MB
      </div>
    </div>
  </div>
</div>