<script>
  import { user } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';
  import FileUploader from '$lib/components/FileUploader.svelte';
  
  let uploadedMaterials = [];
  let errors = [];
  let currentFolderId = null;
  let showSuccess = false;
  
  // 업로드 성공 처리
  function handleUploadSuccess(event) {
    const { file, data } = event.detail;
    uploadedMaterials = [...uploadedMaterials, data];
    showSuccess = true;
    
    // 3초 후 성공 메시지 숨기기
    setTimeout(() => {
      showSuccess = false;
    }, 3000);
  }
  
  // 에러 처리
  function handleUploadError(event) {
    errors = [...errors, ...event.detail.errors];
    
    // 5초 후 에러 메시지 제거
    setTimeout(() => {
      errors = [];
    }, 5000);
  }
  
  // 내 자료 페이지로 이동
  function goToMyMaterials() {
    goto('/my-materials');
  }
  
  // 추출 페이지로 이동
  function goToExtraction(materialId) {
    goto(`/extract/${materialId}`);
  }
</script>

<svelte:head>
  <title>자료 올리기 - Class Easy</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-4xl">
  <div class="mb-8">
    <h1 class="text-3xl font-bold mb-2">자료 올리기</h1>
    <p class="text-base-content/70">PDF, 이미지 파일을 업로드하여 문제를 추출하고 교육 자료를 만들어보세요.</p>
  </div>

  <!-- 에러 메시지 -->
  {#if errors.length > 0}
    <div class="alert alert-error mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <div>
        {#each errors as error}
          <p>{error}</p>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 성공 메시지 -->
  {#if showSuccess}
    <div class="alert alert-success mb-6">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>파일이 성공적으로 업로드되었습니다!</span>
    </div>
  {/if}

  <!-- 파일 업로더 컴포넌트 -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <FileUploader
        acceptedTypes={['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']}
        maxSize={52428800}
        multiple={true}
        currentFolderId={currentFolderId}
        on:upload={handleUploadSuccess}
        on:error={handleUploadError}
      />
    </div>
  </div>

  <!-- 업로드된 자료 목록 -->
  {#if uploadedMaterials.length > 0}
    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-4">업로드된 자료</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each uploadedMaterials as material}
          <div class="card bg-base-100 shadow hover:shadow-lg transition-shadow">
            <div class="card-body">
              <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                  <div class="text-3xl">
                    {#if material.mime_type?.includes('pdf')}📄
                    {:else if material.mime_type?.includes('image')}🖼️
                    {:else}📎
                    {/if}
                  </div>
                  <div>
                    <h3 class="font-medium">{material.title}</h3>
                    <p class="text-sm text-base-content/60">
                      {(material.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                <div class="badge badge-success">
                  업로드 완료
                </div>
              </div>
              
              <div class="mt-4 flex gap-2">
                <button 
                  class="btn btn-primary btn-sm"
                  on:click={() => goToExtraction(material.id)}
                >
                  문제 추출
                </button>
                <button 
                  class="btn btn-ghost btn-sm"
                  on:click={goToMyMaterials}
                >
                  내 자료 보기
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- 팁 섹션 -->
  <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="card bg-primary/10">
      <div class="card-body">
        <h3 class="card-title text-primary">💡 지원 형식</h3>
        <p class="text-sm">PDF, PNG, JPG 파일을 업로드할 수 있습니다. 최대 50MB까지 지원됩니다.</p>
      </div>
    </div>
    
    <div class="card bg-secondary/10">
      <div class="card-body">
        <h3 class="card-title text-secondary">🤖 AI 추출</h3>
        <p class="text-sm">업로드된 파일에서 자동으로 문제, 텍스트, 이미지를 추출합니다.</p>
      </div>
    </div>
    
    <div class="card bg-accent/10">
      <div class="card-body">
        <h3 class="card-title text-accent">📚 문제 은행</h3>
        <p class="text-sm">추출된 문제는 문제 은행에 저장하여 재사용할 수 있습니다.</p>
      </div>
    </div>
  </div>
</div>