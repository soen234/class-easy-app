<script>
  import TabNavigation from './TabNavigation.svelte';
  import MaterialList from './MaterialList.svelte';
  import { writable } from 'svelte/store';

  export let folderId = null;

  const activeTab = writable('original');
  
  let currentTab = 'original';
  
  activeTab.subscribe(value => {
    currentTab = value;
  });
</script>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
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
    <MaterialList type={currentTab} initialFolderId={folderId} />
  </div>
</div>