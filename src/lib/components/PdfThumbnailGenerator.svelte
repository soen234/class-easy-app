<script>
  import { onMount } from 'svelte';
  import { generatePdfThumbnail } from '$lib/utils/pdfThumbnail.js';
  import { supabase } from '$lib/supabase.js';
  
  export let materialId;
  export let fileUrl;
  export let onComplete = () => {};
  export let onError = () => {};
  
  let generating = false;
  let progress = 0;
  
  onMount(() => {
    generateThumbnail();
  });
  
  async function generateThumbnail() {
    if (!fileUrl || !materialId) {
      console.error('Missing fileUrl or materialId');
      return;
    }
    
    generating = true;
    progress = 10;
    
    try {
      progress = 20;
      
      // PDF 썸네일 생성
      const result = await generatePdfThumbnail(fileUrl, {
        scale: 1.5,
        maxWidth: 300,
        maxHeight: 400,
        quality: 0.85
      });
      
      progress = 80;
      
      const { blob, pages } = result;
      
      progress = 90;
      
      // Supabase Storage에 업로드
      const fileName = `thumbnails/${materialId}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('materials-original')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('materials-original')
        .getPublicUrl(fileName);
      
      progress = 100;
      
      // materials 테이블 업데이트
      const { error: updateError } = await supabase
        .from('materials')
        .update({ 
          thumbnail_url: publicUrl,
          preview_url: publicUrl,
          pages: pdf.numPages
        })
        .eq('id', materialId);
      
      if (updateError) {
        throw updateError;
      }
      
      // 완료 콜백
      onComplete({
        thumbnailUrl: publicUrl,
        pages: pages
      });
      
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      onError(error);
    } finally {
      generating = false;
    }
  }
</script>

<div class="relative">
  {#if generating}
    <div class="flex flex-col items-center gap-2 p-4">
      <div class="text-sm text-base-content/70">썸네일 생성 중...</div>
      <progress class="progress progress-primary w-full max-w-xs" value={progress} max="100"></progress>
      <div class="text-xs text-base-content/50">{progress}%</div>
    </div>
  {/if}
</div>