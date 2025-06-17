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

<div class="min-h-screen bg-gray-50">
  <div class="max-w-7xl mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">내 DB</h1>
    
    <TabNavigation {activeTab} />
    
    <div class="mt-6">
      {#if currentTab === 'original' || currentTab === 'lesson'}
        <MaterialList type={currentTab} />
      {:else if currentTab === 'question-bank'}
        <QuestionBank />
      {/if}
    </div>
  </div>
</div>