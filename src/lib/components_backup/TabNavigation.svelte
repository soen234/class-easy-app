<script>
  export let activeTab;
  
  const tabs = [
    { id: 'original', label: '원본 자료' },
    { id: 'lesson', label: '제작한 자료' },
    { id: 'question-bank', label: '문제 은행' }
  ];
  
  function handleTabClick(tabId) {
    activeTab.set(tabId);
  }
</script>

<div class="border-b border-gray-200">
  <nav class="-mb-px flex space-x-8" aria-label="Tabs">
    {#each tabs as tab}
      <button
        on:click={() => handleTabClick(tab.id)}
        class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors
               {$activeTab === tab.id ? 'border-blue-500 text-blue-600' : ''}"
        aria-current={$activeTab === tab.id ? 'page' : undefined}
      >
        {tab.label}
      </button>
    {/each}
  </nav>
</div>