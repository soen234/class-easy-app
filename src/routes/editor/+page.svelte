<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  
  // Editor state
  let canvas;
  let canvasElement;
  let selectedTool = 'select';
  let selectedObject = null;
  let projectData = {
    title: '새 프로젝트',
    template: null,
    objects: []
  };
  
  // Tools
  const tools = [
    { id: 'select', name: '선택', icon: 'M6.5 6.5L17.5 17.5' },
    { id: 'text', name: '텍스트', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'shape', name: '도형', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'image', name: '이미지', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'block', name: '블록', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
  ];
  
  // Canvas properties
  let zoom = 100;
  let showGrid = true;
  let showRuler = true;
  
  onMount(async () => {
    // Initialize Fabric.js canvas
    const { fabric } = await import('fabric');
    canvas = new fabric.Canvas(canvasElement, {
      width: 800,
      height: 600,
      backgroundColor: 'white'
    });
    
    // Set up event handlers
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => selectedObject = null);
    
    // Load template if provided
    const templateId = $page.url.searchParams.get('template');
    if (templateId) {
      // TODO: Load template data
    }
  });
  
  onDestroy(() => {
    if (canvas) {
      canvas.dispose();
    }
  });
  
  function handleSelection(e) {
    selectedObject = e.selected[0];
  }
  
  function selectTool(toolId) {
    selectedTool = toolId;
  }
  
  async function addText() {
    const { fabric } = await import('fabric');
    const text = new fabric.Textbox('새 텍스트', {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 20,
      fontFamily: 'Arial'
    });
    canvas.add(text);
    canvas.setActiveObject(text);
  }
  
  async function addRectangle() {
    const { fabric } = await import('fabric');
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3B82F6',
      width: 100,
      height: 100
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  }
  
  async function addCircle() {
    const { fabric } = await import('fabric');
    const circle = new fabric.Circle({
      left: 100,
      top: 100,
      fill: '#10B981',
      radius: 50
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  }
  
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const { fabric } = await import('fabric');
        fabric.Image.fromURL(event.target.result, (img) => {
          img.scaleToWidth(200);
          canvas.add(img);
          canvas.setActiveObject(img);
        });
      };
      reader.readAsDataURL(file);
    }
  }
  
  function saveProject() {
    const canvasData = canvas.toJSON();
    projectData.objects = canvasData.objects;
    // TODO: Save to database
    console.log('Saving project:', projectData);
  }
  
  function exportAsPDF() {
    // TODO: Implement PDF export
    alert('PDF 내보내기 기능은 곧 추가될 예정입니다.');
  }
  
  function toggleGrid() {
    showGrid = !showGrid;
    // TODO: Implement grid display
  }
  
  function toggleRuler() {
    showRuler = !showRuler;
    // TODO: Implement ruler display
  }
  
  function zoomIn() {
    zoom = Math.min(200, zoom + 10);
    canvas.setZoom(zoom / 100);
  }
  
  function zoomOut() {
    zoom = Math.max(50, zoom - 10);
    canvas.setZoom(zoom / 100);
  }
</script>

<svelte:head>
  <title>편집기 - {projectData.title} - Class Easy</title>
</svelte:head>

<div class="h-screen flex flex-col bg-base-200">
  <!-- Top Menu Bar -->
  <div class="navbar bg-base-100 shadow-md">
    <div class="navbar-start">
      <button class="btn btn-ghost btn-sm" on:click={() => goto('/create')}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        뒤로
      </button>
    </div>
    <div class="navbar-center">
      <input 
        type="text" 
        class="input input-ghost text-center font-medium"
        bind:value={projectData.title}
        placeholder="프로젝트 제목"
      />
    </div>
    <div class="navbar-end">
      <button class="btn btn-ghost btn-sm" on:click={saveProject}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
        </svg>
        저장
      </button>
      <button class="btn btn-primary btn-sm" on:click={exportAsPDF}>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        내보내기
      </button>
    </div>
  </div>
  
  <!-- Main Editor Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Toolbar -->
    <div class="w-16 bg-base-100 shadow-md flex flex-col items-center py-4 space-y-2">
      {#each tools as tool}
        <button 
          class="btn btn-ghost btn-square btn-sm {selectedTool === tool.id ? 'btn-active' : ''}"
          on:click={() => selectTool(tool.id)}
          title={tool.name}
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tool.icon}></path>
          </svg>
        </button>
      {/each}
      
      <div class="divider my-2"></div>
      
      <!-- Add elements buttons -->
      <button 
        class="btn btn-ghost btn-square btn-sm"
        on:click={addText}
        title="텍스트 추가"
      >
        T
      </button>
      <button 
        class="btn btn-ghost btn-square btn-sm"
        on:click={addRectangle}
        title="사각형 추가"
      >
        □
      </button>
      <button 
        class="btn btn-ghost btn-square btn-sm"
        on:click={addCircle}
        title="원 추가"
      >
        ○
      </button>
      <label class="btn btn-ghost btn-square btn-sm" title="이미지 업로드">
        📷
        <input type="file" accept="image/*" class="hidden" on:change={handleImageUpload} />
      </label>
    </div>
    
    <!-- Canvas Area -->
    <div class="flex-1 overflow-auto bg-base-300 p-8">
      <div class="inline-block shadow-2xl">
        <canvas bind:this={canvasElement}></canvas>
      </div>
    </div>
    
    <!-- Right Properties Panel -->
    <div class="w-64 bg-base-100 shadow-md p-4">
      <h3 class="font-bold mb-4">속성</h3>
      
      {#if selectedObject}
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">위치</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" class="input input-bordered input-sm" placeholder="X" />
              <input type="number" class="input input-bordered input-sm" placeholder="Y" />
            </div>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">크기</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <input type="number" class="input input-bordered input-sm" placeholder="너비" />
              <input type="number" class="input input-bordered input-sm" placeholder="높이" />
            </div>
          </div>
          
          <div class="form-control">
            <label class="label">
              <span class="label-text">색상</span>
            </label>
            <input type="color" class="input input-bordered h-10" />
          </div>
        </div>
      {:else}
        <p class="text-base-content/60 text-sm">객체를 선택하면 속성을 편집할 수 있습니다.</p>
      {/if}
    </div>
  </div>
  
  <!-- Bottom Status Bar -->
  <div class="h-10 bg-base-100 border-t flex items-center justify-between px-4">
    <div class="flex items-center space-x-4">
      <button 
        class="btn btn-ghost btn-xs"
        class:btn-active={showGrid}
        on:click={toggleGrid}
      >
        그리드
      </button>
      <button 
        class="btn btn-ghost btn-xs"
        class:btn-active={showRuler}
        on:click={toggleRuler}
      >
        눈금자
      </button>
    </div>
    
    <div class="flex items-center space-x-2">
      <button class="btn btn-ghost btn-xs" on:click={zoomOut}>-</button>
      <span class="text-sm">{zoom}%</span>
      <button class="btn btn-ghost btn-xs" on:click={zoomIn}>+</button>
    </div>
  </div>
</div>

<style>
  /* Custom styles for the editor */
  :global(.canvas-container) {
    margin: 0 auto;
  }
</style>