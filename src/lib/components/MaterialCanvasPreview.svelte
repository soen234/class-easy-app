<script>
  import { onMount, onDestroy } from 'svelte';
  import { calculateGridLayout, createTestHeader, PAPER_SIZES, GRID_SIZE, setFabricInstance } from '$lib/utils/blockToCanvas.js';
  
  // Lazy load export function to avoid SSR issues
  let exportAsPDF;
  
  // Fabric will be loaded dynamically in onMount
  let fabric;
  
  export let blocks = [];
  export let formatOptions = {};
  export let testInfo = {};
  export let pageSize = 'A4';
  export let showGrid = true;
  export let selectedTool = 'select';
  export let selectedShape = null;
  export let orientation = 'portrait';
  
  let canvasElement;
  let canvas;
  let currentPageIndex = 0;
  let pages = [];
  let zoom = 100; // Start at 100% zoom
  let containerWidth = 800;
  let containerHeight = 600;
  
  // Drag and drop variables
  let isDragging = false;
  let draggedObject = null;
  let dragStartPos = null;
  let originalPos = null;
  
  // Drawing variables
  let isDrawing = false;
  let drawingObject = null;
  let mouseDownPoint = null;
  
  // Scroll position variables
  let scrollContainer;
  let lastScrollLeft = 0;
  let lastScrollTop = 0;
  
  // Helper function to debounce resize events
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Update container dimensions
  function updateContainerDimensions() {
    if (!scrollContainer) return;
    
    const rect = scrollContainer.getBoundingClientRect();
    const newWidth = rect.width - 32; // padding (16px * 2)
    const newHeight = rect.height - 32; // padding (16px * 2)
    
    // Check if dimensions actually changed
    if (Math.abs(newWidth - containerWidth) < 1 && Math.abs(newHeight - containerHeight) < 1) {
      return false;
    }
    
    containerWidth = Math.max(400, newWidth);
    containerHeight = Math.max(400, newHeight);
    
    // Only log significant changes
    if (Math.abs(newWidth - containerWidth) > 10 || Math.abs(newHeight - containerHeight) > 10) {
      console.log('Updated container dimensions:', containerWidth, 'x', containerHeight);
    }
    
    return true;
  }
  
  // Initialize canvas with proper dimensions
  function initializeCanvas() {
    if (!canvasElement || !fabric) return;
    
    let paperSize = PAPER_SIZES[pageSize];
    
    // Apply orientation
    if (orientation === 'landscape' || (formatOptions && formatOptions.orientation === 'landscape')) {
      paperSize = {
        width: paperSize.height,
        height: paperSize.width
      };
    } else {
      paperSize = { ...paperSize };
    }
    
    // Calculate initial zoom to fit width
    const scaleX = containerWidth / paperSize.width;
    zoom = scaleX * 100;
    zoom = Math.max(10, Math.min(200, zoom)); // Clamp between 10% and 200%
    
    console.log('Paper size:', paperSize.width, 'x', paperSize.height);
    console.log('Orientation:', orientation || formatOptions.orientation || 'portrait');
    console.log('Initial zoom:', Math.round(zoom) + '%');
    
    canvas = new fabric.Canvas(canvasElement, {
      width: paperSize.width * (zoom / 100),
      height: paperSize.height * (zoom / 100),
      backgroundColor: '#ffffff',
      selection: true, // Enable selection for drag and drop
      renderOnAddRemove: false, // Improve performance
      enableRetinaScaling: true, // Enable high DPI support
      imageSmoothingEnabled: true // Enable image smoothing
    });
    
    // Set up event handlers for drag and drop
    setupDragAndDrop();
    
    updatePreview();
  }
  
  // Initialize canvas
  onMount(async () => {
    if (!canvasElement) return;
    
    // Dynamically import fabric.js
    try {
      const fabricModule = await import('fabric');
      fabric = fabricModule.fabric || fabricModule;
      // Set fabric instance in blockToCanvas
      setFabricInstance(fabric);
    } catch (error) {
      console.error('Failed to load fabric.js:', error);
      return;
    }
    
    // Load export function
    if (!exportAsPDF) {
      const exportModule = await import('$lib/utils/exportManager.js');
      exportAsPDF = exportModule.exportAsPDF;
    }
    
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      updateContainerDimensions();
      initializeCanvas();
    });
    
    // Add keyboard event listener for delete
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvas) {
        // Check if any text object is being edited
        const activeObject = canvas.getActiveObject();
        if (activeObject && activeObject.isEditing) {
          // Don't delete object if text is being edited
          return;
        }
        
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length > 0) {
          e.preventDefault();
          activeObjects.forEach(obj => {
            canvas.remove(obj);
            // Remove from pages array
            if (pages[currentPageIndex]) {
              const index = pages[currentPageIndex].objects.indexOf(obj);
              if (index > -1) {
                pages[currentPageIndex].objects.splice(index, 1);
              }
            }
          });
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    // Handle window resize
    const handleWindowResize = debounce(() => {
      if (updateContainerDimensions()) {
        fitToWindow();
      }
    }, 300);
    
    window.addEventListener('resize', handleWindowResize);
    
    // Use ResizeObserver for container changes
    let resizeObserver;
    let isResizing = false;
    
    const handleContainerResize = debounce(() => {
      if (!isResizing) {
        isResizing = true;
        requestAnimationFrame(() => {
          if (updateContainerDimensions()) {
            fitToWindow();
          }
          isResizing = false;
        });
      }
    }, 300);
    
    // Only observe after initial setup is complete
    setTimeout(() => {
      if (scrollContainer && window.ResizeObserver) {
        resizeObserver = new ResizeObserver((entries) => {
          // Check if size actually changed
          for (let entry of entries) {
            const { width, height } = entry.contentRect;
            const prevWidth = scrollContainer.dataset.prevWidth || 0;
            const prevHeight = scrollContainer.dataset.prevHeight || 0;
            
            // Only trigger if size changed by more than 1px
            if (Math.abs(width - prevWidth) > 1 || Math.abs(height - prevHeight) > 1) {
              scrollContainer.dataset.prevWidth = width;
              scrollContainer.dataset.prevHeight = height;
              handleContainerResize();
            }
          }
        });
        resizeObserver.observe(scrollContainer);
      }
    }, 500);
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  });
  
  // Update preview when data changes
  $: if (canvas && (blocks || formatOptions || testInfo)) {
    updatePreview();
  }
  
  // Update canvas size when zoom changes
  $: if (canvas && zoom) {
    updateCanvasZoom();
  }
  
  function updateCanvasZoom() {
    if (!canvas || !scrollContainer) return;
    
    const paperSize = PAPER_SIZES[pageSize];
    const newZoom = zoom / 100;
    
    // Get current center point in viewport
    const viewportCenterX = scrollContainer.scrollLeft + scrollContainer.clientWidth / 2;
    const viewportCenterY = scrollContainer.scrollTop + scrollContainer.clientHeight / 2;
    
    // Convert to canvas coordinates
    const oldZoom = canvas.getZoom();
    const canvasCenterX = viewportCenterX / oldZoom;
    const canvasCenterY = viewportCenterY / oldZoom;
    
    // Update canvas size
    canvas.setWidth(paperSize.width * newZoom);
    canvas.setHeight(paperSize.height * newZoom);
    canvas.setZoom(newZoom);
    canvas.renderAll();
    
    // Calculate new scroll position to keep the same center
    requestAnimationFrame(() => {
      if (scrollContainer) {
        const newViewportCenterX = canvasCenterX * newZoom;
        const newViewportCenterY = canvasCenterY * newZoom;
        
        scrollContainer.scrollLeft = Math.max(0, newViewportCenterX - scrollContainer.clientWidth / 2);
        scrollContainer.scrollTop = Math.max(0, newViewportCenterY - scrollContainer.clientHeight / 2);
      }
    });
  }
  
  function updatePreview() {
    if (!canvas) return;
    
    console.log('updatePreview called with', blocks.length, 'blocks');
    
    // Clear previous pages to avoid duplication
    pages = [];
    
    // Calculate layout
    pages = calculateGridLayout(blocks, pageSize, formatOptions);
    
    console.log('Generated', pages.length, 'pages');
    
    // Add test header to first page if test info exists
    if (pages.length > 0 && testInfo.title) {
      const headerObjects = createTestHeader(testInfo, pageSize);
      pages[0].objects = [...headerObjects, ...pages[0].objects];
    }
    
    // Ensure current page index is valid
    if (currentPageIndex >= pages.length) {
      currentPageIndex = Math.max(0, pages.length - 1);
    }
    
    // Display current page
    displayPage(currentPageIndex);
  }
  
  async function displayPage(pageIndex) {
    if (!canvas || !pages[pageIndex]) return;
    
    console.log('displayPage called for page:', pageIndex);
    console.log('Objects before clear:', canvas.getObjects().length);
    
    // Clear all objects from canvas
    canvas.clear();
    canvas.discardActiveObject();
    canvas.renderAll();
    
    console.log('Objects after clear:', canvas.getObjects().length);
    
    // Add grid if enabled
    if (showGrid) {
      drawGrid();
    }
    
    // Add page border
    const paperSize = PAPER_SIZES[pageSize];
    const pageBorder = new fabric.Rect({
      left: 0,
      top: 0,
      width: paperSize.width,
      height: paperSize.height,
      fill: 'transparent',
      stroke: '#e0e0e0',
      strokeWidth: 1,
      selectable: false,
      evented: false
    });
    canvas.add(pageBorder);
    
    // Process objects and load images
    const processedObjects = await processObjectsWithImages(pages[pageIndex].objects);
    
    console.log('Adding', processedObjects.length, 'objects to canvas');
    
    // Add processed objects to canvas
    processedObjects.forEach((obj, index) => {
      // Add unique ID to track objects
      obj._uniqueId = `${pageIndex}_${index}_${Date.now()}`;
      
      // Ensure all objects have proper selection attributes
      obj.set({
        selectable: true,
        evented: true,
        hasControls: true,  // Enable resize controls
        hasBorders: true,
        lockScalingFlip: true
      });
      canvas.add(obj);
    });
    
    console.log('Total objects on canvas:', canvas.getObjects().length);
    canvas.renderAll();
  }
  
  async function processObjectsWithImages(objects) {
    const processedObjects = [];
    
    console.log('Processing objects with images:', objects.length);
    
    for (const obj of objects) {
      // Process image placeholders
      if (obj.isImagePlaceholder && obj.imageUrl) {
        // Load image and replace placeholder
        const img = await loadImage(obj.imageUrl, obj.imagePosition);
        if (img) {
          // Set proper attributes for the loaded image
          img.set({
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockScalingFlip: true
          });
          processedObjects.push(img);
        } else {
          console.warn('Failed to load image, keeping placeholder');
          processedObjects.push(obj); // Keep placeholder if image fails
        }
      } else {
        // For all other objects, just add them
        processedObjects.push(obj);
      }
    }
    
    return processedObjects;
  }
  
  function loadImage(imageUrl, position) {
    return new Promise((resolve) => {
      console.log('Loading image:', imageUrl);
      console.log('Image position:', position);
      
      // Ensure position has default values
      const pos = position || { x: 0, y: 0, width: 200, height: 200 };
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = function() {
        console.log('Image loaded, creating fabric image');
        console.log('Original image size:', img.width, 'x', img.height);
        
        const fabricImg = new fabric.Image(img, {
          objectCaching: false, // Disable caching for better quality
          imageSmoothing: true
        });
        
        // Calculate scale to fit position while maintaining quality
        const scale = Math.min(
          pos.width / img.width,
          pos.height / img.height
        );
        
        fabricImg.set({
          left: pos.x,
          top: pos.y,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockScalingFlip: true
        });
        
        // Set filter for better quality
        fabricImg.filters.push(new fabric.Image.filters.Resize({
          resizeType: 'hermite',
          scaleX: scale,
          scaleY: scale
        }));
        fabricImg.applyFilters();
        
        console.log('Fabric image created successfully with scale:', scale);
        resolve(fabricImg);
      };
      
      img.onerror = function(e) {
        console.error('Failed to load image:', imageUrl, e);
        resolve(null);
      };
      
      img.src = imageUrl;
    });
  }
  
  function drawGrid() {
    const paperSize = PAPER_SIZES[pageSize];
    
    // Vertical lines
    for (let x = 0; x <= paperSize.width; x += GRID_SIZE) {
      const line = new fabric.Line([x, 0, x, paperSize.height], {
        stroke: '#f0f0f0',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true // Exclude grid from export
      });
      canvas.add(line);
    }
    
    // Horizontal lines
    for (let y = 0; y <= paperSize.height; y += GRID_SIZE) {
      const line = new fabric.Line([0, y, paperSize.width, y], {
        stroke: '#f0f0f0',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true // Exclude grid from export
      });
      canvas.add(line);
    }
  }
  
  function setupDragAndDrop() {
    if (!canvas) return;
    
    // Mouse down - start dragging or drawing
    canvas.on('mouse:down', function(options) {
      const pointer = canvas.getPointer(options.e);
      mouseDownPoint = pointer;
      
      if (selectedTool === 'select') {
        if (options.target && options.target.selectable) {
          isDragging = true;
          draggedObject = options.target;
          dragStartPos = pointer;
          originalPos = {
            left: draggedObject.left,
            top: draggedObject.top
          };
        }
      } else if (selectedTool === 'text') {
        // Add text at click position
        addText(pointer.x, pointer.y);
      } else if (selectedTool === 'shape' && selectedShape) {
        // Start drawing shape
        isDrawing = true;
        startDrawingShape(pointer.x, pointer.y);
      }
    });
    
    // Mouse move - update position or shape
    canvas.on('mouse:move', function(options) {
      const pointer = canvas.getPointer(options.e);
      
      if (isDragging && draggedObject) {
        const deltaX = pointer.x - dragStartPos.x;
        const deltaY = pointer.y - dragStartPos.y;
        
        draggedObject.set({
          left: originalPos.left + deltaX,
          top: originalPos.top + deltaY
        });
        
        // Snap to grid if enabled
        if (showGrid) {
          draggedObject.set({
            left: Math.round(draggedObject.left / GRID_SIZE) * GRID_SIZE,
            top: Math.round(draggedObject.top / GRID_SIZE) * GRID_SIZE
          });
        }
        
        canvas.renderAll();
      } else if (isDrawing && drawingObject) {
        // Update shape size while drawing
        updateDrawingShape(pointer.x, pointer.y);
      }
    });
    
    // Mouse up - stop dragging or drawing
    canvas.on('mouse:up', function() {
      if (isDragging && draggedObject) {
        // Update the page objects with new position
        updateObjectPosition(draggedObject);
        isDragging = false;
        draggedObject = null;
        dragStartPos = null;
        originalPos = null;
      } else if (isDrawing && drawingObject) {
        // Finish drawing
        isDrawing = false;
        drawingObject = null;
        mouseDownPoint = null;
      }
    });
    
    // Selection created
    canvas.on('selection:created', function(options) {
      // Ensure controls are visible
      if (options.selected) {
        options.selected.forEach(obj => {
          obj.set({
            hasControls: true,
            hasBorders: true,
            borderColor: '#1a73e8',
            borderScaleFactor: 2
          });
        });
        canvas.renderAll();
        
        // Emit selection event to parent
        const event = new CustomEvent('selection', {
          detail: { object: options.selected[0] }
        });
        canvasElement.dispatchEvent(event);
      }
    });
    
    // Selection cleared
    canvas.on('selection:cleared', function() {
      canvas.renderAll();
      
      // Emit selection cleared event to parent
      const event = new CustomEvent('selection', {
        detail: { object: null }
      });
      canvasElement.dispatchEvent(event);
    });
    
    // Selection updated
    canvas.on('selection:updated', function(options) {
      if (options.selected && options.selected.length > 0) {
        // Emit selection event to parent
        const event = new CustomEvent('selection', {
          detail: { object: options.selected[0] }
        });
        canvasElement.dispatchEvent(event);
      }
    });
  }
  
  // Export canvas for parent component access
  export { canvas };
  
  function updateObjectPosition(object) {
    // Update the position in the pages array for persistence
    if (pages[currentPageIndex]) {
      const objects = pages[currentPageIndex].objects;
      const index = objects.findIndex(obj => obj === object);
      if (index !== -1) {
        // Update position data
        objects[index].left = object.left;
        objects[index].top = object.top;
      }
    }
  }
  
  function addText(x, y) {
    if (!canvas || !fabric) return;
    
    const text = new fabric.IText('텍스트를 입력하세요', {
      left: x,
      top: y,
      fontFamily: 'Arial',
      fontSize: 20,
      fill: '#000000',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true
    });
    
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    
    // Enter editing mode
    text.enterEditing();
    text.selectAll();
    
    // Add to page objects
    if (pages[currentPageIndex]) {
      pages[currentPageIndex].objects.push(text);
    }
  }
  
  function startDrawingShape(x, y) {
    if (!canvas || !fabric || !selectedShape) return;
    
    let shape;
    const options = {
      left: x,
      top: y,
      fill: 'transparent',
      stroke: '#000000',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true
    };
    
    switch (selectedShape) {
      case 'rectangle':
        shape = new fabric.Rect({
          ...options,
          width: 0,
          height: 0
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          ...options,
          radius: 0
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          ...options,
          width: 0,
          height: 0
        });
        break;
      case 'line':
        shape = new fabric.Line([x, y, x, y], {
          ...options,
          fill: null
        });
        break;
      default:
        return;
    }
    
    drawingObject = shape;
    canvas.add(shape);
    canvas.renderAll();
  }
  
  function updateDrawingShape(x, y) {
    if (!drawingObject || !mouseDownPoint) return;
    
    const width = Math.abs(x - mouseDownPoint.x);
    const height = Math.abs(y - mouseDownPoint.y);
    const left = Math.min(x, mouseDownPoint.x);
    const top = Math.min(y, mouseDownPoint.y);
    
    switch (selectedShape) {
      case 'rectangle':
      case 'triangle':
        drawingObject.set({
          left: left,
          top: top,
          width: width,
          height: height
        });
        break;
      case 'circle':
        drawingObject.set({
          left: mouseDownPoint.x,
          top: mouseDownPoint.y,
          radius: Math.sqrt(width * width + height * height) / 2
        });
        break;
      case 'line':
        drawingObject.set({
          x2: x,
          y2: y
        });
        break;
    }
    
    canvas.renderAll();
  }
  
  function nextPage() {
    if (currentPageIndex < pages.length - 1) {
      currentPageIndex++;
      displayPage(currentPageIndex);
    }
  }
  
  function prevPage() {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      displayPage(currentPageIndex);
    }
  }
  
  function zoomIn() {
    zoom = Math.min(zoom + 10, 200);
  }
  
  function zoomOut() {
    zoom = Math.max(zoom - 10, 10);
  }
  
  function fitToWindow() {
    if (!scrollContainer || !canvas) return;
    
    // Always update container dimensions
    updateContainerDimensions();
    
    const paperSize = PAPER_SIZES[pageSize];
    // Fit to width (가로 폭 맞춤)
    const padding = 32; // Account for container padding
    const availableWidth = containerWidth - padding;
    const scaleX = availableWidth / paperSize.width;
    const newZoom = Math.round(scaleX * 100);
    
    // Always update zoom for fit to width
    zoom = Math.max(10, Math.min(200, newZoom)); // Clamp between 10% and 200%
    console.log('FitToWindow - zoom:', zoom + '%');
    
    // Force canvas update
    updateCanvasZoom();
    
    // Reset scroll to top-left after fitting
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollLeft = 0;
        scrollContainer.scrollTop = 0;
      }
    });
  }
  
  onDestroy(() => {
    if (canvas) {
      canvas.dispose();
    }
  });
  
  // Export method for parent component
  export async function exportToPDF() {
    if (!canvas || !pages || pages.length === 0) {
      throw new Error('No content to export');
    }
    
    if (!exportAsPDF) {
      throw new Error('Export function not loaded yet');
    }
    
    await exportAsPDF(canvas, pages, {
      pageSize: pageSize,
      fileName: `${testInfo.title || 'material'}.pdf`
    });
  }
</script>

<div class="h-full flex flex-col bg-base-200 rounded-lg">
  <!-- Preview toolbar -->
  <div class="flex items-center justify-between p-2 bg-base-100 border-b flex-shrink-0">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium">미리보기</span>
      <div class="badge badge-sm">{pageSize}</div>
      {#if pages.length > 0}
        <div class="badge badge-sm badge-primary">
          {currentPageIndex + 1} / {pages.length} 페이지
        </div>
      {/if}
    </div>
    
    <div class="flex items-center gap-1">
      <!-- Grid toggle -->
      <button 
        class="btn btn-ghost btn-xs"
        class:btn-active={showGrid}
        on:click={() => showGrid = !showGrid}
        title="그리드 표시"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
        </svg>
      </button>
      
      <!-- Zoom controls -->
      <div class="btn-group">
        <button class="btn btn-xs" on:click={zoomOut}>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
          </svg>
        </button>
        <button class="btn btn-xs">{Math.round(zoom)}%</button>
        <button class="btn btn-xs" on:click={zoomIn}>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
        </button>
      </div>
      
      <button class="btn btn-ghost btn-xs" on:click={fitToWindow} title="화면에 맞추기">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Canvas container -->
  <div class="flex-1 overflow-auto bg-gray-100" bind:this={scrollContainer}>
    <div class="p-4 flex justify-center">
      <div class="shadow-xl bg-white">
        <canvas bind:this={canvasElement}></canvas>
      </div>
    </div>
  </div>
  
  <!-- Page navigation -->
  {#if pages.length > 1}
    <div class="flex items-center justify-center gap-2 p-2 bg-base-100 border-t flex-shrink-0">
      <button 
        class="btn btn-sm btn-ghost"
        on:click={prevPage}
        disabled={currentPageIndex === 0}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
        </svg>
      </button>
      
      <span class="text-sm">
        페이지 {currentPageIndex + 1} / {pages.length}
      </span>
      
      <button 
        class="btn btn-sm btn-ghost"
        on:click={nextPage}
        disabled={currentPageIndex === pages.length - 1}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  {/if}
</div>

<style>
  canvas {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
  }
  
  :global(.canvas-container) {
    display: inline-block !important;
  }
</style>