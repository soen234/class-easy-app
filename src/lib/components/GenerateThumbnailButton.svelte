<script>
  import { createEventDispatcher } from 'svelte';
  import PdfThumbnailGenerator from './PdfThumbnailGenerator.svelte';
  import { supabase } from '$lib/supabase.js';
  
  export let material;
  
  const dispatch = createEventDispatcher();
  
  let showGenerator = false;
  let fileUrl = '';
  
  function handleClick() {
    if (material.file_type === 'application/pdf' && !material.thumbnail_url) {
      fileUrl = material.file_url || supabase.storage.from('materials-original').getPublicUrl(material.file_path).data.publicUrl;
      showGenerator = true;
    }
  }
  
  function handleComplete(event) {
    showGenerator = false;
    dispatch('generated', event.detail);
  }
  
  function handleError(error) {
    showGenerator = false;
    console.error('Thumbnail generation error:', error);
  }
</script>

{#if material.file_type === 'application/pdf' && !material.thumbnail_url}
  <button 
    class="btn btn-ghost btn-xs"
    on:click|stopPropagation={handleClick}
    title="썸네일 생성"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
    </svg>
    썸네일 생성
  </button>
{/if}

{#if showGenerator}
  <div class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
    <div class="bg-base-100 rounded-lg shadow-xl w-full max-w-md p-6">
      <h3 class="text-lg font-bold mb-4">PDF 썸네일 생성 중</h3>
      
      <div class="mb-4">
        <div class="text-sm font-medium">{material.title}</div>
      </div>
      
      <PdfThumbnailGenerator
        materialId={material.id}
        fileUrl={fileUrl}
        onComplete={handleComplete}
        onError={handleError}
      />
      
      <div class="mt-4">
        <button 
          class="btn btn-sm btn-ghost"
          on:click={() => showGenerator = false}
        >
          취소
        </button>
      </div>
    </div>
  </div>
{/if}