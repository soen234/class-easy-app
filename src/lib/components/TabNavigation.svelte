<script>
  export let activeTab;
  
  const tabs = [
    { id: 'original', label: '원본 자료' },
    { id: 'lesson', label: '제작한 자료' }
  ];
  
  function handleTabClick(tabId) {
    activeTab.set(tabId);
  }
</script>

<div class="tabs tabs-bordered">
  {#each tabs as tab}
    <button
      on:click={() => handleTabClick(tab.id)}
      class="tab tab-lg {$activeTab === tab.id ? 'tab-active' : ''}"
      aria-current={$activeTab === tab.id ? 'page' : undefined}
    >
      {tab.label}
    </button>
  {/each}
</div>