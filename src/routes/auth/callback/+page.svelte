<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  onMount(async () => {
    // OAuth 인증 완료 후 처리
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth error:', error);
      goto('/auth?error=' + encodeURIComponent(error.message));
    } else if (data.session) {
      // 로그인 성공
      goto('/');
    } else {
      // 세션이 없으면 로그인 페이지로
      goto('/auth');
    }
  });
</script>

<svelte:head>
  <title>로그인 중... - Class Easy</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="text-center">
    <div class="loading loading-spinner loading-lg text-primary"></div>
    <p class="mt-4 text-lg">로그인 중...</p>
  </div>
</div>