<script>
  import TabNavigation from './TabNavigation.svelte';
  import MaterialList from './MaterialList.svelte';
  import QuestionBank from './QuestionBank.svelte';
  import { writable } from 'svelte/store';

  const activeTab = writable('original');
  
  let currentTab = 'original';
  
  activeTab.subscribe(value => {
    currentTab = value;
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold">내 자료</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        <li>내 자료</li>
      </ul>
    </div>
  </div>
  
  <TabNavigation {activeTab} />
  
  <div class="mt-6">
    {#if currentTab === 'original' || currentTab === 'lesson'}
      <MaterialList type={currentTab} />
    {:else if currentTab === 'question-bank'}
      <QuestionBank />
    {/if}
  </div>
</div>