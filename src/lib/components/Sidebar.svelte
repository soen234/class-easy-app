<script>
  import { page } from '$app/stores';
  import { user, signOut } from '$lib/stores/auth.js';
  import { sidebarCollapsed } from '$lib/stores/sidebar.js';
  import { onMount } from 'svelte';
  
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
      name: '문제 은행', 
      href: '/question-bank', 
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' 
    },
    { 
      name: '자료 만들기', 
      href: '/create', 
      icon: 'M12 4v16m8-8H4' 
    },
  ];

  let isHovered = false;

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }
  
  function handleMouseEnter() {
    if ($sidebarCollapsed) {
      isHovered = true;
    }
  }
  
  function handleMouseLeave() {
    if ($sidebarCollapsed) {
      isHovered = false;
    }
  }
  
  // Keyboard shortcut for toggling sidebar (Ctrl/Cmd + B)
  onMount(() => {
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        sidebarCollapsed.toggle();
      }
    }
    
    window.addEventListener('keydown', handleKeydown);
    
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="drawer-side">
  <label for="drawer-toggle" class="drawer-overlay"></label>
  <div 
    class="min-h-full bg-base-200 text-base-content transition-all duration-300 relative flex flex-col
           {$sidebarCollapsed && !isHovered ? 'w-16' : 'w-64'}"
    on:mouseenter={handleMouseEnter}
    on:mouseleave={handleMouseLeave}
  >
    <!-- Edge indicator when collapsed -->
    {#if $sidebarCollapsed && !isHovered}
      <div class="absolute right-0 top-0 h-full w-0.5 bg-base-300"></div>
    {/if}
    
    <!-- Logo -->
    <div class="p-4 overflow-hidden">
      {#if $sidebarCollapsed && !isHovered}
        <h1 class="text-2xl font-bold text-primary text-center">CE</h1>
      {:else}
        <h1 class="text-2xl font-bold text-primary whitespace-nowrap">Class Easy</h1>
        <p class="text-sm text-base-content/70 whitespace-nowrap">콘텐츠 제작 도구</p>
      {/if}
    </div>
    
    <!-- Navigation -->
    <ul class="menu p-2 space-y-1">
      {#each navigation as item}
        <li>
          <a 
            href={item.href} 
            class="flex items-center p-3 rounded-lg transition-all duration-200
                   {$page.url.pathname === item.href ? 'bg-primary text-primary-content' : 'hover:bg-base-300'}
                   {$sidebarCollapsed && !isHovered ? 'justify-center' : ''}"
            title={$sidebarCollapsed && !isHovered ? item.name : ''}
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
            </svg>
            {#if !$sidebarCollapsed || isHovered}
              <span class="ml-3 whitespace-nowrap">{item.name}</span>
            {/if}
          </a>
        </li>
      {/each}
    </ul>
    
    <!-- Divider and Toggle Button -->
    <div class="mt-auto px-2 mb-4">
      <div class="divider my-2"></div>
      <button
        class="btn btn-ghost btn-sm w-full justify-start rounded-lg
               hover:bg-base-300 transition-colors
               {$sidebarCollapsed && !isHovered ? 'btn-square justify-center px-0' : ''}"
        on:click={() => sidebarCollapsed.toggle()}
        title={$sidebarCollapsed ? '사이드바 펼치기 (Ctrl+B)' : '사이드바 접기 (Ctrl+B)'}
      >
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if $sidebarCollapsed}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          {:else}
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
          {/if}
        </svg>
        {#if !$sidebarCollapsed || isHovered}
          <span class="ml-3 whitespace-nowrap text-sm">
            사이드바 {$sidebarCollapsed ? '펼치기' : '접기'}
          </span>
        {/if}
      </button>
    </div>
    
    <!-- User Section -->
    <div class="mb-4 mx-2">
      {#if $user}
        <!-- Logged in user -->
        <div class="dropdown dropdown-top dropdown-end">
          <div 
            tabindex="0" 
            role="button" 
            class="p-3 bg-base-300 rounded-lg hover:bg-base-content/10 transition-colors cursor-pointer"
          >
            <div class="flex items-center {$sidebarCollapsed && !isHovered ? 'justify-center' : ''}">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-8">
                  <span class="text-sm">{$user.email?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              {#if !$sidebarCollapsed || isHovered}
                <div class="flex-1 min-w-0 ml-3">
                  <p class="text-sm font-medium truncate">{$user.email}</p>
                  <p class="text-xs text-base-content/70">로그인됨</p>
                </div>
              {/if}
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
        <a 
          href="/auth" 
          class="block p-3 bg-base-300 rounded-lg hover:bg-base-content/10 transition-colors"
          title={$sidebarCollapsed && !isHovered ? '로그인하기' : ''}
        >
          <div class="flex items-center {$sidebarCollapsed && !isHovered ? 'justify-center' : ''}">
            <div class="avatar placeholder">
              <div class="bg-primary text-primary-content rounded-full w-8">
                <span class="text-sm">?</span>
              </div>
            </div>
            {#if !$sidebarCollapsed || isHovered}
              <div class="flex-1 min-w-0 ml-3">
                <p class="text-sm font-medium">로그인하기</p>
                <p class="text-xs text-base-content/70">계정에 연결</p>
              </div>
            {/if}
          </div>
        </a>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Add smooth transition for width changes */
  .drawer-side > div {
    overflow-x: hidden;
  }
  
  /* Ensure dropdown works properly in collapsed state */
  .dropdown-content {
    left: auto !important;
    right: 0;
  }
  
  /* Add shadow when hovering in collapsed state */
  .drawer-side > div:hover {
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
  
  /* Tooltip styles */
  [title] {
    position: relative;
  }
  
  /* Smooth hover effect */
  .menu a {
    position: relative;
    overflow: hidden;
  }
  
  .menu a::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background-color: transparent;
    transition: background-color 0.2s;
  }
  
  .menu a:hover::before {
    background-color: var(--primary);
  }
</style>