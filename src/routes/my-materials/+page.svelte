<script>
  import MyMaterials from '$lib/components/MyMaterials.svelte';
  import { page } from '$app/stores';
  
  // Get folder ID from URL params
  $: folderId = $page.url.searchParams.get('folder') || null;
</script>

<svelte:head>
  <title>내 자료 - Class Easy</title>
</svelte:head>

<MyMaterials {folderId} />