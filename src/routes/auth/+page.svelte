<script>
  import { goto } from '$app/navigation';
  import { signIn, signUp, signInWithGoogle } from '$lib/supabase.js';
  import { user } from '$lib/stores/auth.js';
  
  let mode = 'login';
  let email = '';
  let password = '';
  let name = '';
  let loading = false;
  let error = null;
  
  async function handleSubmit() {
    loading = true;
    error = null;
    
    try {
      if (mode === 'login') {
        const { data, error: authError } = await signIn(email, password);
        
        if (authError) {
          console.error('Login error:', authError);
          if (authError.message.includes('Invalid login credentials')) {
            error = '이메일 또는 비밀번호가 올바르지 않습니다.';
          } else if (authError.message.includes('Email not confirmed')) {
            error = '이메일 인증을 완료해주세요.';
          } else {
            error = authError.message;
          }
        } else if (data?.user) {
          user.set(data.user);
          localStorage.setItem('sb-access-token', data.session?.access_token);
          // Supabase 쿠키 형식으로 토큰 설정
          if (data.session?.access_token) {
            document.cookie = `sb-lyjmljtnbodquvwkoizz-auth-token=${data.session.access_token}; path=/; max-age=86400`;
            if (data.session?.refresh_token) {
              document.cookie = `sb-lyjmljtnbodquvwkoizz-auth-token-refresh=${data.session.refresh_token}; path=/; max-age=86400`;
            }
          }
          goto('/');
        }
      } else {
        const { data, error: authError } = await signUp(email, password, {
          full_name: name
        });
        
        if (authError) {
          console.error('Signup error:', authError);
          if (authError.message.includes('User already registered')) {
            error = '이미 등록된 이메일입니다.';
          } else if (authError.message.includes('Password should be at least')) {
            error = '비밀번호는 최소 6자 이상이어야 합니다.';
          } else if (authError.message.includes('rate limit')) {
            error = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          } else {
            error = authError.message;
          }
        } else {
          // 회원가입 후 자동 로그인
          const { data: loginData } = await signIn(email, password);
          if (loginData?.user) {
            user.set(loginData.user);
            localStorage.setItem('sb-access-token', loginData.session?.access_token || 'demo-token');
            // Supabase 쿠키 형식으로 토큰 설정
            if (loginData.session?.access_token) {
              document.cookie = `sb-lyjmljtnbodquvwkoizz-auth-token=${loginData.session.access_token}; path=/; max-age=86400`;
              if (loginData.session?.refresh_token) {
                document.cookie = `sb-lyjmljtnbodquvwkoizz-auth-token-refresh=${loginData.session.refresh_token}; path=/; max-age=86400`;
              }
            }
            goto('/');
          }
        }
      }
    } catch (err) {
      error = err.message || '오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }
  
  async function handleGoogleLogin() {
    loading = true;
    error = null;
    
    try {
      const { data, error: authError } = await signInWithGoogle();
      
      if (authError) {
        error = authError.message;
      } else if (data?.user) {
        user.set(data.user);
        localStorage.setItem('sb-access-token', data.session?.access_token || 'demo-token');
        goto('/');
      }
    } catch (err) {
      error = err.message || '오류가 발생했습니다.';
    } finally {
      loading = false;
    }
  }
  
  // 이미 로그인된 경우 홈으로 이동
  $: if ($user) {
    goto('/');
  }
</script>

<svelte:head>
  <title>{mode === 'login' ? '로그인' : '회원가입'} - Class Easy</title>
</svelte:head>

<div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
  <div class="card w-full max-w-md bg-base-100 shadow-xl">
    <div class="card-body">
      <!-- 헤더 -->
      <div class="text-center mb-6">
        <h1 class="text-3xl font-bold text-primary">Class Easy</h1>
        <p class="text-base-content/70 mt-2">
          {mode === 'login' ? '로그인하여 시작하기' : '새 계정 만들기'}
        </p>
      </div>
      
      <!-- 탭 전환 -->
      <div class="tabs tabs-boxed mb-6">
        <button 
          class="tab {mode === 'login' ? 'tab-active' : ''}"
          on:click={() => { mode = 'login'; error = null; }}
        >
          로그인
        </button>
        <button 
          class="tab {mode === 'register' ? 'tab-active' : ''}"
          on:click={() => { mode = 'register'; error = null; }}
        >
          회원가입
        </button>
      </div>
      
      <!-- 에러 메시지 -->
      {#if error}
        <div class="alert alert-error mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{error}</span>
        </div>
      {/if}
      
      <!-- 폼 -->
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        {#if mode === 'register'}
          <div class="form-control">
            <label class="label" for="name">
              <span class="label-text">이름</span>
            </label>
            <input 
              id="name"
              type="text" 
              placeholder="홍길동" 
              class="input input-bordered" 
              bind:value={name}
              required={mode === 'register'}
              disabled={loading}
            />
          </div>
        {/if}
        
        <div class="form-control">
          <label class="label" for="email">
            <span class="label-text">이메일</span>
          </label>
          <input 
            id="email"
            type="email" 
            placeholder="user@example.com" 
            class="input input-bordered" 
            bind:value={email}
            required
            disabled={loading}
            autocomplete="email"
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
            minlength="6"
            disabled={loading}
            autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary w-full"
          disabled={loading}
        >
          {#if loading}
            <span class="loading loading-spinner"></span>
          {/if}
          {mode === 'login' ? '로그인' : '회원가입'}
        </button>
      </form>
      
      <!-- 구분선 -->
      <div class="divider">또는</div>
      
      <!-- 소셜 로그인 -->
      <button 
        class="btn btn-outline w-full"
        on:click={handleGoogleLogin}
        disabled={loading}
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google로 계속하기
      </button>
      
      <!-- 개발 모드 빠른 로그인 -->
      <div class="text-center mt-4">
        <button 
          class="btn btn-ghost btn-sm"
          on:click={async () => {
            loading = true;
            // 데모 사용자로 직접 설정
            const demoUser = {
              id: 'demo-user',
              email: 'demo@example.com',
              user_metadata: { name: '데모 사용자' }
            };
            user.set(demoUser);
            localStorage.setItem('sb-access-token', 'demo-token');
            localStorage.setItem('demo-mode', 'true');
            // 쿠키 설정을 위해 서버로 요청
            document.cookie = 'demo-mode=true; path=/; max-age=86400';
            await goto('/');
          }}
        >
          🚀 데모 모드로 시작하기
        </button>
      </div>
      
      <!-- 홈으로 돌아가기 -->
      <div class="text-center mt-2">
        <a href="/" class="link link-neutral text-sm">← 홈으로 돌아가기</a>
      </div>
    </div>
  </div>
</div>