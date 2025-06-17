<script>
  import { page } from '$app/stores';
  import { user, signOut } from '$lib/stores/auth.js';
  
  const navigation = [
    { 
      name: '홈', 
      href: '/', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
    },
    { 
      name: '내 자료', 
      href: '/my-materials', 
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' 
    },
    { 
      name: '자료 올리기', 
      href: '/upload', 
      icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' 
    },
    { 
      name: '문항 추출', 
      href: '/extract', 
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' 
    },
    { 
      name: '편집기', 
      href: '/editor', 
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' 
    },
    { 
      name: '템플릿', 
      href: '/templates', 
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' 
    },
  ];

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }
</script>

<div class="drawer-side">
  <label for="drawer-toggle" class="drawer-overlay"></label>
  <div class="min-h-full w-64 bg-base-200 text-base-content">
    <!-- Logo -->
    <div class="p-4">
      <h1 class="text-2xl font-bold text-primary">Class Easy</h1>
      <p class="text-sm text-base-content/70">콘텐츠 제작 도구</p>
    </div>
    
    <!-- Navigation -->
    <ul class="menu p-4 space-y-2">
      {#each navigation as item}
        <li>
          <a 
            href={item.href} 
            class="flex items-center space-x-3 p-3 rounded-lg transition-colors
                   {$page.url.pathname === item.href ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
            </svg>
            <span>{item.name}</span>
          </a>
        </li>
      {/each}
    </ul>
    
    <!-- User Section -->
    <div class="absolute bottom-4 left-4 right-4">
      {#if $user}
        <!-- Logged in user -->
        <div class="dropdown dropdown-top">
          <div tabindex="0" role="button" class="p-3 bg-base-300 rounded-lg hover:bg-base-content/10 transition-colors cursor-pointer">
            <div class="flex items-center space-x-3">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-8">
                  <span class="text-sm">{$user.email?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate">{$user.email}</p>
                <p class="text-xs text-base-content/70">로그인됨</p>
              </div>
            </div>
          </div>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow mb-2">
            <li><a href="/profile">프로필</a></li>
            <li><a href="/settings">설정</a></li>
            <li><button on:click={handleSignOut}>로그아웃</button></li>
          </ul>
        </div>
      {:else}
        <!-- Not logged in -->
        <a href="/auth" class="block p-3 bg-base-300 rounded-lg hover:bg-base-content/10 transition-colors">
          <div class="flex items-center space-x-3">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-sm">?</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">로그인하기</p>
              <p class="text-xs text-base-content/70">계정에 연결</p>
            </div>
          </div>
        </a>
      {/if}
    </div>
  </div>
</div>