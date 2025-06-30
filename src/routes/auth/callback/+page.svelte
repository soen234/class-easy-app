<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  
  onMount(async () => {
    // OAuth 콜백 처리
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth callback error:', error);
      await goto('/login?error=auth_failed');
    } else if (session) {
      // 로그인 성공
      await goto('/');
    } else {
      // 세션이 없는 경우
      await goto('/login');
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="text-center">
    <span class="loading loading-spinner loading-lg"></span>
    <p class="mt-4">인증 처리 중...</p>
  </div>
</div>