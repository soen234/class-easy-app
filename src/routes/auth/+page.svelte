<script>
  import { signIn, signUp, signInWithGoogle, signInWithGitHub } from '$lib/stores/auth.js';
  import { goto } from '$app/navigation';
  
  let email = '';
  let password = '';
  let isLogin = true;
  let loading = false;
  let error = '';

  async function handleSubmit() {
    loading = true;
    error = '';
    
    try {
      let result;
      if (isLogin) {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password);
      }
      
      if (result.error) {
        error = result.error.message;
      } else {
        if (isLogin) {
          goto('/');
        } else {
          // 회원가입 성공 시 확인 메시지
          error = '회원가입이 완료되었습니다! 이메일을 확인해주세요.';
        }
      }
    } catch (err) {
      error = '오류가 발생했습니다. 다시 시도해주세요.';
    } finally {
      loading = false;
    }
  }

  async function handleGoogleSignIn() {
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      error = authError.message;
    }
  }

  async function handleGitHubSignIn() {
    const { error: authError } = await signInWithGitHub();
    if (authError) {
      error = authError.message;
    }
  }

  function toggleMode() {
    isLogin = !isLogin;
    email = '';
    password = '';
    error = '';
  }
</script>

<svelte:head>
  <title>{isLogin ? '로그인' : '회원가입'} - Class Easy</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-200">
  <div class="card w-full max-w-md bg-base-100 shadow-xl">
    <div class="card-body">
      <!-- Logo -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-primary">Class Easy</h1>
        <p class="text-base-content/70">AI 기반 교육 콘텐츠 제작 도구</p>
      </div>

      <!-- Toggle Buttons -->
      <div class="tabs tabs-boxed mb-6">
        <button 
          class="tab flex-1 {isLogin ? 'tab-active' : ''}"
          on:click={() => isLogin = true}
        >
          로그인
        </button>
        <button 
          class="tab flex-1 {!isLogin ? 'tab-active' : ''}"
          on:click={() => isLogin = false}
        >
          회원가입
        </button>
      </div>

      <!-- Error Alert -->
      {#if error}
        <div class="alert {error.includes('완료') ? 'alert-success' : 'alert-error'}">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      <!-- Form -->
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div class="form-control">
          <label class="label" for="email">
            <span class="label-text">이메일</span>
          </label>
          <input 
            id="email"
            type="email" 
            placeholder="your@email.com"
            class="input input-bordered" 
            bind:value={email}
            required 
          />
        </div>

        <div class="form-control">
          <label class="label" for="password">
            <span class="label-text">비밀번호</span>
          </label>
          <input 
            id="password"
            type="password" 
            placeholder="••••••••"
            class="input input-bordered" 
            bind:value={password}
            required 
          />
        </div>

        {#if isLogin}
          <div class="form-control">
            <label class="label cursor-pointer justify-start space-x-2">
              <input type="checkbox" class="checkbox checkbox-sm" />
              <span class="label-text">로그인 상태 유지</span>
            </label>
          </div>
        {/if}

        <div class="form-control mt-6">
          <button 
            type="submit" 
            class="btn btn-primary"
            class:loading={loading}
            disabled={loading}
          >
            {loading ? '' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </div>
      </form>

      <!-- Divider -->
      <div class="divider">또는</div>

      <!-- Social Login -->
      <div class="space-y-2">
        <button class="btn btn-outline w-full" on:click={handleGoogleSignIn}>
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 {isLogin ? '로그인' : '회원가입'}
        </button>
        
        <button class="btn btn-outline w-full" on:click={handleGitHubSignIn}>
          <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.404-5.965 1.404-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.222.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/>
          </svg>
          GitHub로 {isLogin ? '로그인' : '회원가입'}
        </button>
      </div>

      {#if isLogin}
        <div class="text-center mt-4">
          <a href="#" class="link link-primary text-sm">비밀번호를 잊으셨나요?</a>
        </div>
      {/if}

      <!-- Back to Home -->
      <div class="text-center mt-6">
        <a href="/" class="link link-neutral text-sm">← 홈으로 돌아가기</a>
      </div>
    </div>
  </div>
</div>