<script>
  import '../app.css';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { initAuth, user, loading } from '$lib/stores/auth.js';
  import { cleanupLocalStorage, checkStorageHealth } from '$lib/utils/storageCleanup.js';
  import { migrateFromLocalStorage } from '$lib/utils/fileStorage.js';

  onMount(async () => {
    // Supabase 세션 초기화
    await initAuth();
    
    // 스토리지 상태 확인 및 정리
    try {
      const health = checkStorageHealth();
      console.log('Storage health:', health);
      
      if (!health.isHealthy) {
        console.warn('Storage usage is high. Cleaning up...');
        const cleanupReport = cleanupLocalStorage();
        console.log('Cleanup report:', cleanupReport);
      }
      
      // localStorage에서 IndexedDB로 마이그레이션
      await migrateFromLocalStorage();
    } catch (error) {
      console.error('Storage maintenance error:', error);
    }
  });
</script>

<div class="drawer lg:drawer-open">
  <input id="drawer-toggle" type="checkbox" class="drawer-toggle" />
  
  <!-- Main content -->
  <div class="drawer-content flex flex-col">
    <!-- Top navbar for mobile -->
    <div class="navbar bg-base-100 lg:hidden">
      <div class="flex-none">
        <label for="drawer-toggle" class="btn btn-square btn-ghost">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </label>
      </div>
      <div class="flex-1">
        <span class="text-xl font-bold">Class Easy</span>
      </div>
    </div>
    
    <!-- Page content -->
    <main class="flex-1 p-6 lg:p-8">
      <slot />
    </main>
  </div>
  
  <!-- Sidebar -->
  <Sidebar />
</div>

<style>
  :global(html) {
    height: 100%;
  }
  :global(body) {
    height: 100%;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
</style>