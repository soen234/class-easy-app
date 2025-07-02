<script>
  import { onMount } from 'svelte';
  import { user } from '$lib/stores/auth.js';
  import { materials, fetchMaterials } from '$lib/stores/materials.js';
  import { blocks, fetchBlocks } from '$lib/stores/blocks.js';
  import { supabase } from '$lib/supabase.js';
  
  let stats = {
    totalMaterials: 0,
    totalBlocks: 0,
    totalTemplates: 0,
    recentActivities: []
  };
  
  onMount(async () => {
    if ($user?.id) {
      // 자료 가져오기
      await fetchMaterials($user.id);
      stats.totalMaterials = $materials.length;
      
      // 블록 가져오기
      await fetchBlocks($user.id);
      stats.totalBlocks = $blocks.length;
      
      // 템플릿 수 가져오기
      const { count } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', $user.id);
      stats.totalTemplates = count || 0;
      
      // 최근 활동 생성
      stats.recentActivities = generateRecentActivities();
    }
  });
  
  function generateRecentActivities() {
    const activities = [];
    
    // 최근 자료 업로드
    const recentMaterials = $materials.slice(0, 2);
    recentMaterials.forEach(material => {
      activities.push({
        type: 'upload',
        title: `${material.title} 업로드`,
        time: getRelativeTime(material.created_at),
        icon: '📄',
        color: 'primary'
      });
    });
    
    // 최근 블록 추출
    const recentBlocks = $blocks.slice(0, 2);
    if (recentBlocks.length > 0) {
      activities.push({
        type: 'extract',
        title: `${recentBlocks.length}개 문항 추출 완료`,
        time: getRelativeTime(recentBlocks[0].created_at),
        icon: '❓',
        color: 'secondary'
      });
    }
    
    return activities.slice(0, 3);
  }
  
  function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    return '방금 전';
  }
</script>

<svelte:head>
  <title>홈 - Class Easy</title>
</svelte:head>

<div class="space-y-8">
  <!-- Welcome Section -->
  <div class="hero bg-gradient-to-r from-primary to-secondary rounded-lg text-primary-content">
    <div class="hero-content text-center py-12">
      <div class="max-w-md">
        <h1 class="text-4xl font-bold mb-4">Class Easy</h1>
        <p class="text-lg mb-6">나만의 문제은행 만들기</p>
        <div class="flex gap-4 justify-center">
          <a href="/upload" class="btn btn-accent">자료 올리기</a>
          <a href="/my-materials" class="btn btn-outline btn-accent">내 자료 보기</a>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-primary">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <div class="stat-title">원본 자료</div>
      <div class="stat-value text-primary">{stats.totalMaterials}</div>
      <div class="stat-desc">업로드된 파일</div>
    </div>

    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-secondary">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="stat-title">문제 은행</div>
      <div class="stat-value text-secondary">{stats.totalBlocks}</div>
      <div class="stat-desc">추출된 문항</div>
    </div>

    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-success">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
        </svg>
      </div>
      <div class="stat-title">제작한 자료</div>
      <div class="stat-value text-success">{stats.totalTemplates}</div>
      <div class="stat-desc">생성된 자료</div>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title mb-4">최근 활동</h2>
      <div class="space-y-4">
        {#if stats.recentActivities.length > 0}
          {#each stats.recentActivities as activity}
            <div class="flex items-center space-x-4 p-3 bg-base-200 rounded-lg">
              <div class="avatar placeholder">
                <div class="bg-{activity.color} text-{activity.color}-content rounded w-10">
                  <span class="text-xs">{activity.icon}</span>
                </div>
              </div>
              <div class="flex-1">
                <p class="font-medium">{activity.title}</p>
                <p class="text-sm text-base-content/70">{activity.time}</p>
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-base-content/70">아직 활동이 없습니다.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title mb-4">빠른 작업</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a href="/upload" class="btn btn-outline btn-primary btn-lg flex-col h-auto py-6">
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
          </svg>
          <span>자료 올리기</span>
        </a>
        
        <a href="/my-materials" class="btn btn-outline btn-secondary btn-lg flex-col h-auto py-6">
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
          </svg>
          <span>내 자료</span>
        </a>
        
        <a href="/editor" class="btn btn-outline btn-accent btn-lg flex-col h-auto py-6">
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
          </svg>
          <span>편집기</span>
        </a>
        
        <a href="/extract" class="btn btn-outline btn-info btn-lg flex-col h-auto py-6">
          <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <span>문항 추출</span>
        </a>
      </div>
    </div>
  </div>
</div>