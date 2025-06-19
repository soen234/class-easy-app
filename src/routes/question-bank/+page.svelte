<script>
  import QuestionBank from '$lib/components/QuestionBank.svelte';
</script>

<svelte:head>
  <title>문제 은행 - Class Easy</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-2">
    <h1 class="text-3xl font-bold">문제 은행</h1>
    <div class="breadcrumbs text-sm">
      <ul>
        <li><a href="/">홈</a></li>
        <li>문제 은행</li>
      </ul>
    </div>
  </div>
  
  <QuestionBank />
</div>