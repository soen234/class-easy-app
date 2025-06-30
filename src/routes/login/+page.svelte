<script>
  import { signIn, signUp, signInWithGoogle } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  
  let email = '';
  let password = '';
  let name = '';
  let isSignUp = false;
  let loading = false;
  let error = null;
  
  // URL 파라미터에서 리다이렉트 경로 확인
  $: redirectTo = $page.url.searchParams.get('redirectTo') || '/';
  
  async function handleSubmit() {
    error = null;
    loading = true;
    
    try {
      let result;
      
      if (isSignUp) {
        // 회원가입
        result = await signUp(email, password, { name });
        
        if (!result.error && result.data?.user) {
          // 회원가입 성공 메시지
          alert('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 인증해주세요.');
          isSignUp = false;
        }
      } else {
        // 로그인
        result = await signIn(email, password);
        
        if (!result.error && result.data?.user) {
          // 로그인 성공 시 리다이렉트
          await goto(redirectTo);
        }
      }
      
      if (result.error) {
        error = result.error.message;
      }
    } catch (e) {
      error = e.message || '오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }
  
  async function handleGoogleLogin() {
    error = null;
    loading = true;
    
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        error = result.error.message;
      }
      // OAuth는 자동으로 리다이렉트됨
    } catch (e) {
      error = e.message || '오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }
  
  function toggleMode() {
    isSignUp = !isSignUp;
    error = null;
  }
</script>

<svelte:head>
  <title>{isSignUp ? '회원가입' : '로그인'} - Class Easy</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-center justify-center text-2xl mb-6">
        {isSignUp ? '회원가입' : '로그인'}
      </h2>
      
      {#if error}
        <div class="alert alert-error mb-4">
          <svg class="stroke-current shrink-0 w-6 h-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleSubmit}>
        {#if isSignUp}
          <div class="form-control mb-4">
            <label class="label" for="name">
              <span class="label-text">이름</span>
            </label>
            <input
              id="name"
              type="text"
              placeholder="홍길동"
              class="input input-bordered"
              bind:value={name}
              required
              disabled={loading}
            />
          </div>
        {/if}
        
        <div class="form-control mb-4">
          <label class="label" for="email">
            <span class="label-text">이메일</span>
          </label>
          <input
            id="email"
            type="email"
            placeholder="email@example.com"
            class="input input-bordered"
            bind:value={email}
            required
            disabled={loading}
            autocomplete="email"
          />
        </div>
        
        <div class="form-control mb-6">
          <label class="label" for="password">
            <span class="label-text">비밀번호</span>
          </label>
          <input
            id="password"
            type="password"
            placeholder="********"
            class="input input-bordered"
            bind:value={password}
            required
            minlength="6"
            disabled={loading}
            autocomplete={isSignUp ? "new-password" : "current-password"}
          />
          {#if isSignUp}
            <label class="label">
              <span class="label-text-alt">최소 6자 이상</span>
            </label>
          {/if}
        </div>
        
        <div class="form-control mb-4">
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {#if loading}
              <span class="loading loading-spinner"></span>
            {/if}
            {isSignUp ? '회원가입' : '로그인'}
          </button>
        </div>
      </form>
      
      <div class="divider">또는</div>
      
      <div class="form-control mb-4">
        <button 
          class="btn btn-outline"
          on:click={handleGoogleLogin}
          disabled={loading}
        >
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 {isSignUp ? '회원가입' : '로그인'}
        </button>
      </div>
      
      <div class="text-center">
        <span class="text-sm">
          {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
        </span>
        <button 
          class="link link-primary ml-1"
          on:click={toggleMode}
          type="button"
        >
          {isSignUp ? '로그인' : '회원가입'}
        </button>
      </div>
    </div>
  </div>
</div>