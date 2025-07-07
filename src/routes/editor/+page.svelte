<script>
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { user } from '$lib/stores/auth.js';
  import * as fabric from 'fabric';
  
  // Editor state
  let canvas;
  let canvasElement;
  let selectedTool = 'select';
  let selectedObject = null;
  let projectId = null;
  let projectData = {
    title: '새 프로젝트',
    template: null,
    pages: [
      { id: 1, name: '페이지 1', objects: [] }
    ],
    currentPageId: 1
  };
  
  // Page management
  let currentPage = projectData.pages[0];
  let showPagePanel = false;
  
  // Undo/Redo
  let history = [];
  let historyStep = -1;
  
  // Clipboard
  let clipboard = null;
  
  // Object alignment and arrangement
  function alignObjects(alignment) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    if (activeObject.type === 'activeSelection') {
      const objects = activeObject.getObjects();
      const bounds = activeObject.getBoundingRect();
      
      objects.forEach(obj => {
        switch (alignment) {
          case 'left':
            obj.set('left', bounds.left + obj.width * obj.scaleX / 2);
            break;
          case 'center-h':
            obj.set('left', bounds.left + bounds.width / 2);
            break;
          case 'right':
            obj.set('left', bounds.left + bounds.width - obj.width * obj.scaleX / 2);
            break;
          case 'top':
            obj.set('top', bounds.top + obj.height * obj.scaleY / 2);
            break;
          case 'center-v':
            obj.set('top', bounds.top + bounds.height / 2);
            break;
          case 'bottom':
            obj.set('top', bounds.top + bounds.height - obj.height * obj.scaleY / 2);
            break;
        }
      });
      canvas.renderAll();
      saveState();
    }
  }
  
  function distributeObjects(direction) {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'activeSelection') return;
    
    const objects = activeObject.getObjects();
    if (objects.length < 3) return;
    
    if (direction === 'horizontal') {
      objects.sort((a, b) => a.left - b.left);
      const leftMost = objects[0].left;
      const rightMost = objects[objects.length - 1].left;
      const spacing = (rightMost - leftMost) / (objects.length - 1);
      
      objects.forEach((obj, index) => {
        obj.set('left', leftMost + spacing * index);
      });
    } else {
      objects.sort((a, b) => a.top - b.top);
      const topMost = objects[0].top;
      const bottomMost = objects[objects.length - 1].top;
      const spacing = (bottomMost - topMost) / (objects.length - 1);
      
      objects.forEach((obj, index) => {
        obj.set('top', topMost + spacing * index);
      });
    }
    
    canvas.renderAll();
    saveState();
  }
  
  function bringForward() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringForward(activeObject);
      canvas.renderAll();
      saveState();
    }
  }
  
  function sendBackward() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendBackwards(activeObject);
      canvas.renderAll();
      saveState();
    }
  }
  
  function bringToFront() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringToFront(activeObject);
      canvas.renderAll();
      saveState();
    }
  }
  
  function sendToBack() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendToBack(activeObject);
      canvas.renderAll();
      saveState();
    }
  }
  
  function groupObjects() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'activeSelection') return;
    
    const group = activeObject.toGroup();
    canvas.setActiveObject(group);
    canvas.renderAll();
    saveState();
  }
  
  async function ungroupObjects() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;
    
    // fabric is already imported at the top
    const items = activeObject._objects;
    activeObject._restoreObjectsState();
    canvas.remove(activeObject);
    
    for (let i = 0; i < items.length; i++) {
      canvas.add(items[i]);
    }
    
    const sel = new fabric.ActiveSelection(items, { canvas: canvas });
    canvas.setActiveObject(sel);
    canvas.renderAll();
    saveState();
  }
  
  // Tools
  const tools = [
    { id: 'select', name: '선택', icon: 'M6.5 6.5L17.5 17.5' },
    { id: 'text', name: '텍스트', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'shape', name: '도형', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
    { id: 'image', name: '이미지', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'math', name: '수식', icon: 'M20 14.66V20a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h5.34' },
    { id: 'chart', name: '차트', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'block', name: '문제', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' }
  ];
  
  // Shape types
  const shapeTypes = [
    { id: 'rectangle', name: '사각형', icon: '□' },
    { id: 'circle', name: '원', icon: '○' },
    { id: 'triangle', name: '삼각형', icon: '△' },
    { id: 'line', name: '선', icon: '—' },
    { id: 'arrow', name: '화살표', icon: '→' },
    { id: 'star', name: '별', icon: '★' },
    { id: 'bubble', name: '말풍선', icon: '💬' }
  ];
  
  // Canvas properties
  let zoom = 100;
  let showGrid = false;
  let showGrid = true;
  let showRuler = true;
  let isPanning = false;
  let lastPosX = 0;
  let lastPosY = 0;
  
  // Modal states
  let showMathEditor = false;
  let showChartEditor = false;
  let showQuestionBank = false;
  let showShapeMenu = false;
  let selectedShape = null;
  let showLayersPanel = false;
  
  // Chart editor states
  let chartTitle = '';
  let chartData = '';
  let chartType = 'bar';
  
  // Question bank states
  let selectedQuestions = new Set();
  
  // Drawing states
  let isDrawing = false;
  let drawingObject = null;
  let startX = 0;
  let startY = 0;
  
  // Context menu
  let showContextMenu = false;
  let contextMenuX = 0;
  let contextMenuY = 0;
  let contextMenuTarget = null;
  
  // Advanced features
  let snapEnabled = true;
  let gridSize = 10;
  let showRulers = false;
  let magneticGuides = true;
  let selectedFilter = null;
  
  // Color presets
  const colorPresets = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#C0C0C0', '#FFD700'
  ];
  
  // Font families
  const fontFamilies = [
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { name: 'Impact', value: 'Impact, fantasy' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
    { name: 'Palatino', value: 'Palatino, serif' }
  ];
  
  onMount(async () => {
    try {
      console.log('Fabric object available:', fabric);
      
      // A4 size at 96 DPI (794 x 1123 pixels)
      const pageWidth = 794;
      const pageHeight = 1123;
      
      // Create canvas
      canvas = new fabric.Canvas(canvasElement, {
        width: pageWidth,
        height: pageHeight,
        backgroundColor: 'white',
        preserveObjectStacking: true,
        renderOnAddRemove: true,
        uniformScaling: false
      });
    
    // Add page border shadow effect
    canvas.wrapperEl.style.boxShadow = '0 0 20px rgba(0,0,0,0.1)';
    
    // Enable object caching for better performance
    fabric.Object.prototype.objectCaching = true;
    
    // Set selection styles
    canvas.set({
      selectionColor: 'rgba(59, 130, 246, 0.1)',
      selectionBorderColor: '#3B82F6',
      selectionLineWidth: 2,
      selectionDashArray: [5, 5]
    });
    
    // Enable centered scaling and rotation
    fabric.Object.prototype.centeredScaling = true;
    fabric.Object.prototype.centeredRotation = true;
    
    // Set up event handlers
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => selectedObject = null);
    canvas.on('object:modified', () => {
      saveState();
      autoSave();
    });
    canvas.on('object:added', () => {
      saveState();
      autoSave();
    });
    
    // Set up drawing handlers
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    
    // Double click for text editing
    canvas.on('mouse:dblclick', handleDoubleClick);
    
    // Object moving - snap to grid and guides
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:rotating', handleObjectRotating);
    
    // Load project if provided
    projectId = $page.url.searchParams.get('projectId');
    const templateId = $page.url.searchParams.get('templateId');
    
    if (projectId) {
      loadProject(projectId);
    } else if (templateId) {
      // TODO: Load template data
    }
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Set up zoom and pan
    setupCanvasZoomPan();
    
    // Set up context menu
    setupContextMenu();
    
    // Set up drag and drop
    setupDragAndDrop();
    
    // Save initial state
    saveState();
    
    // Set up auto-save
    setInterval(autoSave, 30000); // Auto-save every 30 seconds
    
    // Fit to width on initial load
    setTimeout(() => {
      fitToWidth();
    }, 100);
    
    } catch (error) {
      console.error('Error initializing canvas:', error);
      showToast('캔버스 초기화 중 오류가 발생했습니다.');
    }
  });
  
  // Auto-save function
  let saveTimeout;
  function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (projectId) {
        saveProjectSilently();
      }
    }, 2000); // Debounce saves by 2 seconds
  }
  
  function saveProjectSilently() {
    if (!projectId || !canvas || !currentPage) return;
    
    // Save current page's canvas data
    const canvasData = canvas.toJSON();
    if (currentPage) {
      currentPage.objects = canvasData.objects;
    }
    
    // Update project data
    projectData.id = projectId;
    projectData.name = projectData.title;
    projectData.updatedAt = new Date().toISOString();
    
    // Save to localStorage
    const stored = localStorage.getItem('userProjects');
    let projects = stored ? JSON.parse(stored) : [];
    
    const existingIndex = projects.findIndex(p => p.id === projectId);
    if (existingIndex >= 0) {
      projects[existingIndex] = projectData;
    } else {
      projectData.createdAt = new Date().toISOString();
      projects.push(projectData);
    }
    
    localStorage.setItem('userProjects', JSON.stringify(projects));
  }
  
  // Snap to grid functionality
  function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize;
  }
  
  // Object moving with snap
  function handleObjectMoving(e) {
    if (snapEnabled && !e.e.shiftKey) {
      const obj = e.target;
      obj.set({
        left: snapToGrid(obj.left),
        top: snapToGrid(obj.top)
      });
    }
    
    // Show alignment guides
    if (magneticGuides) {
      showAlignmentGuides(e.target);
    }
  }
  
  function handleObjectScaling(e) {
    const obj = e.target;
    // Maintain aspect ratio with shift key
    if (e.e.shiftKey) {
      const scale = Math.max(obj.scaleX, obj.scaleY);
      obj.set({
        scaleX: scale,
        scaleY: scale
      });
    }
  }
  
  function handleObjectRotating(e) {
    const obj = e.target;
    // Snap rotation to 15 degree increments with shift key
    if (e.e.shiftKey) {
      const angle = Math.round(obj.angle / 15) * 15;
      obj.set('angle', angle);
    }
  }
  
  // Show alignment guides
  let alignmentLines = [];
  function showAlignmentGuides(activeObject) {
    // Clear existing guides
    alignmentLines.forEach(line => canvas.remove(line));
    alignmentLines = [];
    
    const objects = canvas.getObjects().filter(obj => obj !== activeObject && !obj.isType('line'));
    const activeBox = activeObject.getBoundingRect();
    
    objects.forEach(obj => {
      const targetBox = obj.getBoundingRect();
      
      // Vertical alignment
      if (Math.abs(activeBox.left - targetBox.left) < 5) {
        const line = new fabric.Line([targetBox.left, 0, targetBox.left, canvas.height], {
          stroke: '#FF00FF',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true
        });
        canvas.add(line);
        alignmentLines.push(line);
        activeObject.set('left', targetBox.left);
      }
      
      // Horizontal alignment
      if (Math.abs(activeBox.top - targetBox.top) < 5) {
        const line = new fabric.Line([0, targetBox.top, canvas.width, targetBox.top], {
          stroke: '#FF00FF',
          strokeWidth: 1,
          selectable: false,
          evented: false,
          excludeFromExport: true
        });
        canvas.add(line);
        alignmentLines.push(line);
        activeObject.set('top', targetBox.top);
      }
    });
    
    // Remove guides after object stops moving
    setTimeout(() => {
      alignmentLines.forEach(line => canvas.remove(line));
      alignmentLines = [];
    }, 500);
  }
  
  onDestroy(() => {
    if (canvas) {
      canvas.dispose();
    }
  });
  
  function handleSelection(e) {
    selectedObject = e.selected[0];
    updatePropertyPanel();
  }
  
  function updatePropertyPanel() {
    // Update property panel based on selected object
    if (selectedObject) {
      // Force reactivity
      selectedObject = selectedObject;
    }
  }
  
  // Load project from localStorage
  function loadProject(id) {
    const stored = localStorage.getItem('userProjects');
    if (stored) {
      const projects = JSON.parse(stored);
      const project = projects.find(p => p.id === id);
      if (project) {
        projectData = project;
        projectData.title = project.name || '새 프로젝트';
        currentPage = projectData.pages[0];
        
        // Load canvas content
        if (currentPage && currentPage.objects) {
          canvas.loadFromJSON({ objects: currentPage.objects }, () => {
            canvas.renderAll();
          });
        }
      }
    }
  }
  
  // Save state for undo/redo
  function saveState() {
    if (!canvas) return;
    
    const currentState = JSON.stringify(canvas.toJSON());
    
    // Remove any states after current step
    history = history.slice(0, historyStep + 1);
    
    // Add new state
    history.push(currentState);
    historyStep++;
    
    // Limit history size
    if (history.length > 50) {
      history.shift();
      historyStep--;
    }
  }
  
  // Undo
  function undo() {
    if (historyStep > 0) {
      historyStep--;
      canvas.loadFromJSON(history[historyStep], () => {
        canvas.renderAll();
      });
    }
  }
  
  // Redo
  function redo() {
    if (historyStep < history.length - 1) {
      historyStep++;
      canvas.loadFromJSON(history[historyStep], () => {
        canvas.renderAll();
      });
    }
  }
  
  // Copy
  function copy() {
    if (canvas.getActiveObject()) {
      canvas.getActiveObject().clone((cloned) => {
        clipboard = cloned;
      });
    }
  }
  
  // Enhanced copy to system clipboard
  async function copyToClipboard() {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    // Store in internal clipboard
    copy();
    
    // Try to copy as image to system clipboard
    try {
      activeObject.clone(async (cloned) => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        const bounds = cloned.getBoundingRect();
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        
        // Create temporary fabric canvas
        // fabric is already imported at the top
        const tempFabricCanvas = new fabric.StaticCanvas(tempCanvas, {
          width: bounds.width,
          height: bounds.height
        });
        
        cloned.set({
          left: bounds.width / 2,
          top: bounds.height / 2,
          originX: 'center',
          originY: 'center'
        });
        
        tempFabricCanvas.add(cloned);
        tempFabricCanvas.renderAll();
        
        // Convert to blob and copy to clipboard
        tempCanvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]);
            showToast('복사되었습니다');
          } catch (err) {
            console.log('Clipboard API not supported, using internal clipboard');
          }
        });
      });
    } catch (err) {
      console.error('Copy error:', err);
    }
  }
  
  // Cut to clipboard
  function cutToClipboard() {
    copyToClipboard();
    deleteSelected();
  }
  
  // Paste
  function paste() {
    if (!clipboard) return;
    
    clipboard.clone((clonedObj) => {
      canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });
      if (clonedObj.type === 'activeSelection') {
        clonedObj.canvas = canvas;
        clonedObj.forEachObject((obj) => {
          canvas.add(obj);
        });
        clonedObj.setCoords();
      } else {
        canvas.add(clonedObj);
      }
      clipboard.top += 10;
      clipboard.left += 10;
      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
    });
  }
  
  // Enhanced paste from system clipboard
  async function pasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      
      for (const item of items) {
        // Handle images
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(type => type.startsWith('image/')));
          const url = URL.createObjectURL(blob);
          
          // fabric is already imported at the top
          fabric.Image.fromURL(url, (img) => {
            img.set({
              left: canvas.width / 2,
              top: canvas.height / 2,
              originX: 'center',
              originY: 'center'
            });
            
            // Scale if too large
            const maxWidth = canvas.width * 0.8;
            const maxHeight = canvas.height * 0.8;
            if (img.width > maxWidth || img.height > maxHeight) {
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
              img.scaleToWidth(img.width * scale);
            }
            
            canvas.add(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveState();
            
            URL.revokeObjectURL(url);
          });
          return;
        }
        
        // Handle text
        if (item.types.includes('text/plain')) {
          const text = await item.getType('text/plain');
          const textContent = await text.text();
          
          // fabric is already imported at the top
          const textObj = new fabric.Textbox(textContent, {
            left: canvas.width / 2,
            top: canvas.height / 2,
            width: 200,
            fontSize: 20,
            fontFamily: 'Arial',
            originX: 'center',
            originY: 'center'
          });
          
          canvas.add(textObj);
          canvas.setActiveObject(textObj);
          canvas.renderAll();
          saveState();
          return;
        }
      }
    } catch (err) {
      // Fallback to internal clipboard
      paste();
    }
  }
  
  // Delete selected
  function deleteSelected() {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        activeObject.forEachObject((obj) => {
          canvas.remove(obj);
        });
      } else {
        canvas.remove(activeObject);
      }
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }
  
  // Setup keyboard shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Ctrl/Cmd + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y (Redo)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
      
      // Ctrl/Cmd + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        copyToClipboard();
      }
      
      // Ctrl/Cmd + X (Cut)
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        cutToClipboard();
      }
      
      // Ctrl/Cmd + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteFromClipboard();
      }
      
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
      
      // Ctrl/Cmd + A (Select All)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        canvas.discardActiveObject();
        const sel = new fabric.ActiveSelection(canvas.getObjects(), {
          canvas: canvas,
        });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
      }
      
      // Space for pan mode
      if (e.key === ' ' && !isPanning) {
        e.preventDefault();
        isPanning = true;
        canvas.defaultCursor = 'grab';
        canvas.selection = false;
        canvas.forEachObject((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });
      }
    });
    
    document.addEventListener('keyup', (e) => {
      // Release pan mode
      if (e.key === ' ') {
        e.preventDefault();
        isPanning = false;
        if (selectedTool === 'select') {
          canvas.defaultCursor = 'default';
          canvas.selection = true;
          canvas.forEachObject((obj) => {
            obj.selectable = true;
            obj.evented = true;
          });
        } else {
          canvas.defaultCursor = 'crosshair';
        }
      }
    });
  }
  
  // Setup canvas zoom and pan
  function setupCanvasZoomPan() {
    if (!canvas) {
      console.error('Canvas not initialized for zoom/pan setup');
      return;
    }
    
    console.log('Setting up canvas zoom and pan...');
    
    // Zoom limits
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 5;
    const ORIGINAL_WIDTH = 794;
    const ORIGINAL_HEIGHT = 1123;
    
    // Mouse wheel zoom with cursor point centering
    canvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = canvas.getZoom();
      
      // Smooth exponential zoom
      newZoom *= 0.999 ** delta;
      
      // Apply zoom limits
      if (newZoom > MAX_ZOOM) newZoom = MAX_ZOOM;
      if (newZoom < MIN_ZOOM) newZoom = MIN_ZOOM;
      
      // Zoom to cursor point
      canvas.zoomToPoint({ 
        x: opt.e.offsetX, 
        y: opt.e.offsetY 
      }, newZoom);
      
      // Update canvas dimensions to show the zoom effect
      canvas.setWidth(ORIGINAL_WIDTH * newZoom);
      canvas.setHeight(ORIGINAL_HEIGHT * newZoom);
      
      // Update zoom display
      zoom = Math.round(newZoom * 100);
      
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });
    
    // Pan functionality - separate from drawing mouse events
    let isDragging = false;
    
    canvas.on('mouse:down:before', (opt) => {
      if (isPanning) {
        isDragging = true;
        canvas.selection = false;
        canvas.defaultCursor = 'grabbing';
        const evt = opt.e;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
      }
    });
    
    canvas.on('mouse:move:before', (opt) => {
      if (isPanning && isDragging) {
        const e = opt.e;
        const vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
      }
    });
    
    canvas.on('mouse:up:before', () => {
      if (isPanning) {
        isDragging = false;
        canvas.defaultCursor = 'grab';
      }
    });
  }
  
  // Reset zoom
  function resetZoom() {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.setWidth(794);
    canvas.setHeight(1123);
    zoom = 100;
    canvas.requestRenderAll();
  }
  
  // Zoom in/out functions
  function zoomIn() {
    const center = canvas.getCenter();
    const currentZoom = canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.1, 5);
    
    canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);
    canvas.setWidth(794 * newZoom);
    canvas.setHeight(1123 * newZoom);
    zoom = Math.round(newZoom * 100);
    canvas.requestRenderAll();
  }
  
  function zoomOut() {
    const center = canvas.getCenter();
    const currentZoom = canvas.getZoom();
    const newZoom = Math.max(currentZoom * 0.9, 0.1);
    
    canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);
    canvas.setWidth(794 * newZoom);
    canvas.setHeight(1123 * newZoom);
    zoom = Math.round(newZoom * 100);
    canvas.requestRenderAll();
  }
  
  // Fit to window width
  function fitToWidth() {
    const container = document.querySelector('.canvas-area');
    if (!container || !canvas) return;
    
    const containerWidth = container.clientWidth - 40; // 20px padding on each side
    const pageWidth = 794; // A4 width in pixels
    
    const newZoom = containerWidth / pageWidth;
    
    canvas.setZoom(newZoom);
    canvas.setWidth(pageWidth * newZoom);
    canvas.setHeight(1123 * newZoom);
    zoom = Math.round(newZoom * 100);
    canvas.requestRenderAll();
  }
  
  // Setup context menu
  function setupContextMenu() {
    // Prevent default context menu
    canvasElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      const rect = canvasElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Find target object
      const target = canvas.findTarget(e, false);
      if (target) {
        contextMenuTarget = target;
        canvas.setActiveObject(target);
        canvas.renderAll();
      } else {
        contextMenuTarget = null;
      }
      
      // Show context menu
      contextMenuX = e.clientX;
      contextMenuY = e.clientY;
      showContextMenu = true;
    });
    
    // Hide context menu on click
    document.addEventListener('click', () => {
      showContextMenu = false;
    });
  }
  
  function selectTool(toolId) {
    selectedTool = toolId;
    
    // Reset shape menu
    if (toolId !== 'shape') {
      showShapeMenu = false;
    }
    
    // Update canvas mode
    if (toolId === 'select') {
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      canvas.forEachObject((obj) => {
        obj.selectable = true;
        obj.evented = true;
      });
    } else {
      canvas.selection = false;
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      canvas.forEachObject((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }
    
    // Handle special tools
    switch (toolId) {
      case 'shape':
        showShapeMenu = true;
        break;
      case 'math':
        openMathEditor();
        break;
      case 'chart':
        openChartEditor();
        break;
      case 'block':
        openQuestionBank();
        break;
    }
  }
  
  function selectShape(shapeType) {
    selectedShape = shapeType;
    showShapeMenu = false;
    selectedTool = 'shape';
    
    // Set canvas to non-selection mode for drawing
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });
  }
  
  // Mouse event handlers for drawing
  async function handleMouseDown(options) {
    if (selectedTool === 'select') return;
    
    const pointer = canvas.getPointer(options.e);
    startX = pointer.x;
    startY = pointer.y;
    isDrawing = true;
    
    // fabric is already imported at the top
    
    if (selectedTool === 'text') {
      // Create text immediately
      const text = new fabric.Textbox('클릭하여 텍스트 입력', {
        left: startX,
        top: startY,
        width: 200,
        fontSize: 20,
        fontFamily: 'Arial'
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      isDrawing = false;
      // Keep current tool instead of switching to select
      // selectedTool = 'select';
      // selectTool('select');
    } else if (selectedTool === 'shape' && selectedShape) {
      // Start drawing shape
      switch (selectedShape.id) {
        case 'rectangle':
          drawingObject = new fabric.Rect({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: '#3B82F6',
            stroke: '#2563EB',
            strokeWidth: 2
          });
          break;
        case 'circle':
          drawingObject = new fabric.Circle({
            left: startX,
            top: startY,
            radius: 0,
            fill: '#10B981',
            stroke: '#059669',
            strokeWidth: 2
          });
          break;
        case 'triangle':
          drawingObject = new fabric.Triangle({
            left: startX,
            top: startY,
            width: 0,
            height: 0,
            fill: '#F59E0B',
            stroke: '#D97706',
            strokeWidth: 2
          });
          break;
        case 'line':
          drawingObject = new fabric.Line([startX, startY, startX, startY], {
            stroke: '#000000',
            strokeWidth: 2
          });
          break;
        case 'arrow':
          // For arrow, we'll create it in mouse up
          drawingObject = new fabric.Line([startX, startY, startX, startY], {
            stroke: '#000000',
            strokeWidth: 2
          });
          break;
        case 'star':
          // Create a basic star shape
          drawingObject = new fabric.Polygon([
            {x: 0, y: -50},
            {x: 14, y: -20},
            {x: 47, y: -15},
            {x: 23, y: 7},
            {x: 29, y: 40},
            {x: 0, y: 25},
            {x: -29, y: 40},
            {x: -23, y: 7},
            {x: -47, y: -15},
            {x: -14, y: -20}
          ], {
            left: startX,
            top: startY,
            fill: '#FBBF24',
            stroke: '#F59E0B',
            strokeWidth: 2,
            scaleX: 0,
            scaleY: 0
          });
          break;
        case 'bubble':
          // Create speech bubble as a group
          const rect = new fabric.Rect({
            left: 0,
            top: 0,
            width: 150,
            height: 80,
            rx: 10,
            ry: 10,
            fill: '#E5E7EB',
            stroke: '#9CA3AF',
            strokeWidth: 2
          });
          
          const tail = new fabric.Triangle({
            left: 20,
            top: 78,
            width: 20,
            height: 20,
            fill: '#E5E7EB',
            stroke: '#9CA3AF',
            strokeWidth: 2,
            angle: 45
          });
          
          drawingObject = new fabric.Group([rect, tail], {
            left: startX,
            top: startY,
            scaleX: 0,
            scaleY: 0
          });
          break;
      }
      
      if (drawingObject) {
        canvas.add(drawingObject);
      }
    }
  }
  
  function handleMouseMove(options) {
    if (!isDrawing || !drawingObject) return;
    
    const pointer = canvas.getPointer(options.e);
    
    if (selectedShape) {
      switch (selectedShape.id) {
        case 'rectangle':
          const width = pointer.x - startX;
          const height = pointer.y - startY;
          drawingObject.set({
            width: Math.abs(width),
            height: Math.abs(height),
            left: width > 0 ? startX : pointer.x,
            top: height > 0 ? startY : pointer.y
          });
          break;
        case 'circle':
          const radius = Math.sqrt(Math.pow(pointer.x - startX, 2) + Math.pow(pointer.y - startY, 2)) / 2;
          drawingObject.set({
            radius: radius,
            left: Math.min(startX, pointer.x),
            top: Math.min(startY, pointer.y)
          });
          break;
        case 'triangle':
          const tWidth = pointer.x - startX;
          const tHeight = pointer.y - startY;
          drawingObject.set({
            width: Math.abs(tWidth),
            height: Math.abs(tHeight),
            left: tWidth > 0 ? startX : pointer.x,
            top: tHeight > 0 ? startY : pointer.y
          });
          break;
        case 'line':
        case 'arrow':
          drawingObject.set({
            x2: pointer.x,
            y2: pointer.y
          });
          break;
        case 'star':
        case 'bubble':
          // Scale the shape based on mouse distance
          const scaleX = Math.abs(pointer.x - startX) / 100;
          const scaleY = Math.abs(pointer.y - startY) / 100;
          drawingObject.set({
            scaleX: scaleX,
            scaleY: scaleY
          });
          break;
      }
      canvas.renderAll();
    }
  }
  
  async function handleMouseUp(options) {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    if (drawingObject) {
      // If shape is too small, remove it
      let isTooSmall = false;
      if (drawingObject.width !== undefined && drawingObject.height !== undefined) {
        isTooSmall = drawingObject.width < 5 && drawingObject.height < 5;
      } else if (drawingObject.radius !== undefined) {
        isTooSmall = drawingObject.radius < 5;
      } else if (drawingObject.scaleX !== undefined && drawingObject.scaleY !== undefined) {
        isTooSmall = drawingObject.scaleX < 0.1 && drawingObject.scaleY < 0.1;
      }
      
      if (isTooSmall) {
        canvas.remove(drawingObject);
      } else {
        // Special handling for arrow
        if (selectedShape && selectedShape.id === 'arrow') {
          // fabric is already imported at the top
          canvas.remove(drawingObject);
          
          // Create arrow with arrowhead
          const angle = Math.atan2(drawingObject.y2 - drawingObject.y1, drawingObject.x2 - drawingObject.x1);
          const headLength = 15;
          
          // Create line
          const line = new fabric.Line([drawingObject.x1, drawingObject.y1, drawingObject.x2, drawingObject.y2], {
            stroke: '#000000',
            strokeWidth: 2
          });
          
          // Create arrowhead
          const triangle = new fabric.Triangle({
            left: drawingObject.x2,
            top: drawingObject.y2,
            angle: (angle * 180 / Math.PI) + 90,
            width: 10,
            height: headLength,
            fill: '#000000',
            originX: 'center',
            originY: 'bottom'
          });
          
          // Group them
          const arrow = new fabric.Group([line, triangle]);
          canvas.add(arrow);
          canvas.setActiveObject(arrow);
        }
        
        // Keep current tool instead of switching to select
        // selectedTool = 'select';
        // selectTool('select');
        if (drawingObject && drawingObject.type !== 'line') {
          canvas.setActiveObject(drawingObject);
        }
      }
      drawingObject = null;
    }
  }
  
  // Double click handler for text editing
  function handleDoubleClick(options) {
    const target = canvas.findTarget(options.e);
    if (target && (target.type === 'textbox' || target.type === 'text')) {
      target.enterEditing();
      target.selectAll();
    }
  }
  
  
  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        // fabric is already imported at the top
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
    if (!projectId) {
      // Create new project ID if not exists
      projectId = Date.now().toString();
    }
    
    // Save current page's canvas data
    const canvasData = canvas.toJSON();
    currentPage.objects = canvasData.objects;
    
    // Update project data
    projectData.id = projectId;
    projectData.name = projectData.title;
    projectData.updatedAt = new Date().toISOString();
    
    // Save to localStorage
    const stored = localStorage.getItem('userProjects');
    let projects = stored ? JSON.parse(stored) : [];
    
    const existingIndex = projects.findIndex(p => p.id === projectId);
    if (existingIndex >= 0) {
      projects[existingIndex] = projectData;
    } else {
      projectData.createdAt = new Date().toISOString();
      projects.push(projectData);
    }
    
    localStorage.setItem('userProjects', JSON.stringify(projects));
    
    // Show toast notification
    showToast('프로젝트가 저장되었습니다.');
  }
  
  function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'toast toast-top toast-end';
    toast.innerHTML = `<div class="alert alert-success"><span>${message}</span></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
  
  async function exportAsPDF() {
    try {
      showToast('PDF 생성 중...');
      
      const jsPDF = (await import('jspdf')).default;
      const html2canvas = (await import('html2canvas')).default;
      
      // Create a new PDF document
      const pdf = new jsPDF({
        orientation: projectData.orientation || 'portrait',
        unit: 'mm',
        format: projectData.size || 'a4'
      });
      
      // Get canvas data URL
      const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2
      });
      
      // Calculate dimensions to fit the page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add image to PDF
      pdf.addImage(dataURL, 'PNG', 10, 10, imgWidth, imgHeight);
      
      // Handle multiple pages
      for (let i = 1; i < projectData.pages.length; i++) {
        pdf.addPage();
        // You would load each page's content here
        // For now, we'll just add a placeholder
        pdf.text(`페이지 ${i + 1}`, 10, 20);
      }
      
      // Save the PDF
      pdf.save(`${projectData.title || '프로젝트'}.pdf`);
      showToast('PDF가 생성되었습니다.');
      
    } catch (error) {
      console.error('PDF export error:', error);
      showToast('PDF 생성 중 오류가 발생했습니다.');
    }
  }
  
  function exportAsImage(format = 'png') {
    try {
      // Get canvas as data URL
      const dataURL = canvas.toDataURL({
        format: format,
        quality: format === 'jpeg' ? 0.9 : 1,
        multiplier: 2
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `${projectData.title || '프로젝트'}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast(`${format.toUpperCase()} 이미지가 생성되었습니다.`);
    } catch (error) {
      console.error('Image export error:', error);
      showToast('이미지 생성 중 오류가 발생했습니다.');
    }
  }
  
  async function toggleGrid() {
    showGrid = !showGrid;
    if (showGrid) {
      // fabric is already imported at the top
      const gridSize = 20;
      
      // Create grid pattern
      const patternCanvas = document.createElement('canvas');
      patternCanvas.width = gridSize;
      patternCanvas.height = gridSize;
      const ctx = patternCanvas.getContext('2d');
      ctx.strokeStyle = '#e0e0e0';
      ctx.strokeRect(0.5, 0.5, gridSize, gridSize);
      
      const pattern = new fabric.Pattern({
        source: patternCanvas,
        repeat: 'repeat'
      });
      
      // Apply grid as overlay image
      canvas.setOverlayImage(pattern, canvas.renderAll.bind(canvas), {
        width: canvas.width,
        height: canvas.height,
        originX: 'left',
        originY: 'top'
      });
    } else {
      // Remove grid
      canvas.setOverlayImage(null, canvas.renderAll.bind(canvas));
    }
  }
  
  function toggleRuler() {
    showRuler = !showRuler;
    // TODO: Implement ruler display
  }
  
  
  // Page management functions
  function addNewPage() {
    const newPage = {
      id: Math.max(...projectData.pages.map(p => p.id)) + 1,
      name: `페이지 ${projectData.pages.length + 1}`,
      objects: []
    };
    projectData.pages = [...projectData.pages, newPage];
    switchToPage(newPage.id);
  }
  
  function switchToPage(pageId) {
    // Save current page
    if (currentPage && canvas) {
      currentPage.objects = canvas.toJSON().objects;
    }
    
    // Switch to new page
    currentPage = projectData.pages.find(p => p.id === pageId);
    projectData.currentPageId = pageId;
    
    // Load new page content
    if (canvas && currentPage) {
      canvas.clear();
      if (currentPage.objects) {
        canvas.loadFromJSON({ objects: currentPage.objects }, () => {
          canvas.renderAll();
        });
      }
    }
  }
  
  function deletePage(pageId) {
    if (projectData.pages.length === 1) {
      alert('마지막 페이지는 삭제할 수 없습니다.');
      return;
    }
    
    projectData.pages = projectData.pages.filter(p => p.id !== pageId);
    if (currentPage.id === pageId) {
      switchToPage(projectData.pages[0].id);
    }
  }
  
  function duplicatePage(pageId) {
    const pageToDuplicate = projectData.pages.find(p => p.id === pageId);
    if (pageToDuplicate) {
      const newPage = {
        id: Math.max(...projectData.pages.map(p => p.id)) + 1,
        name: `${pageToDuplicate.name} (복사)`,
        objects: [...pageToDuplicate.objects]
      };
      projectData.pages = [...projectData.pages, newPage];
    }
  }
  
  // Tool-specific functions
  function openMathEditor() {
    showMathEditor = true;
  }
  
  function insertMathFormula(latex) {
    // TODO: Convert LaTeX to canvas object
    console.log('Inserting math formula:', latex);
    showMathEditor = false;
  }
  
  function openChartEditor() {
    showChartEditor = true;
  }
  
  function insertChart() {
    if (!chartTitle || !chartData) {
      console.log('Chart title or data is empty');
      return;
    }
    
    // Parse chart data
    const lines = chartData.trim().split('\n');
    const parsedData = lines.map(line => {
      const [label, value] = line.split(',').map(s => s.trim());
      return { label, value: parseFloat(value) || 0 };
    }).filter(item => item.label && !isNaN(item.value));
    
    console.log('Inserting chart:', { 
      type: chartType, 
      title: chartTitle, 
      data: parsedData 
    });
    
    // TODO: Create actual chart on canvas using Chart.js or similar
    
    // Reset form
    chartTitle = '';
    chartData = '';
    chartType = 'bar';
    showChartEditor = false;
  }
  
  function openQuestionBank() {
    showQuestionBank = true;
  }
  
  function insertQuestionBlock() {
    const questionsArray = Array.from(selectedQuestions);
    if (questionsArray.length === 0) {
      console.log('No questions selected');
      return;
    }
    
    console.log('Inserting questions:', questionsArray);
    
    // TODO: Create actual question blocks on canvas
    
    // Reset selection
    selectedQuestions.clear();
    showQuestionBank = false;
  }
  
  function toggleQuestionSelection(questionId) {
    if (selectedQuestions.has(questionId)) {
      selectedQuestions.delete(questionId);
    } else {
      selectedQuestions.add(questionId);
    }
    selectedQuestions = selectedQuestions; // Trigger reactivity
  }
  
  // Setup drag and drop
  function setupDragAndDrop() {
    if (!canvasElement) {
      console.error('Canvas element not found for drag and drop setup');
      return;
    }
    
    const canvasContainer = canvasElement.parentElement;
    console.log('Setting up drag and drop...', canvasContainer);
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      canvasContainer.addEventListener(eventName, preventDefaults, false);
      console.log(`Added ${eventName} listener`);
    });
    
    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      canvasContainer.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
      canvasContainer.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight(e) {
      console.log('Drag enter/over - highlighting');
      canvasContainer.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
    }
    
    function unhighlight(e) {
      console.log('Drag leave/drop - unhighlighting');
      canvasContainer.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
    }
    
    // Handle dropped files
    canvasContainer.addEventListener('drop', handleDrop, false);
    
    async function handleDrop(e) {
      console.log('Drop event detected', e);
      const dt = e.dataTransfer;
      const files = dt.files;
      console.log('Files dropped:', files);
      
      handleFiles(files);
    }
    
    function handleFiles(files) {
      [...files].forEach(file => {
        if (file.type.startsWith('image/')) {
          uploadImage(file);
        } else if (file.type === 'application/pdf') {
          showToast('PDF 파일 가져오기는 곧 지원될 예정입니다.');
        } else {
          showToast('이미지 파일만 업로드할 수 있습니다.');
        }
      });
    }
    
    async function uploadImage(file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        // fabric is already imported at the top
        fabric.Image.fromURL(event.target.result, (img) => {
          // Scale image to fit canvas if too large
          const maxWidth = canvas.width * 0.8;
          const maxHeight = canvas.height * 0.8;
          
          if (img.width > maxWidth || img.height > maxHeight) {
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            img.scaleToWidth(img.width * scale);
          }
          
          // Center the image
          img.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center'
          });
          
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
          saveState();
        });
      };
      reader.readAsDataURL(file);
    }
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
      <div class="flex items-center gap-2">
        <!-- Undo/Redo -->
        <div class="btn-group">
          <button 
            class="btn btn-ghost btn-sm" 
            on:click={undo}
            disabled={historyStep <= 0}
            title="실행 취소 (Ctrl+Z)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
            </svg>
          </button>
          <button 
            class="btn btn-ghost btn-sm" 
            on:click={redo}
            disabled={historyStep >= history.length - 1}
            title="다시 실행 (Ctrl+Y)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"></path>
            </svg>
          </button>
        </div>
        
        <div class="divider divider-horizontal mx-2"></div>
        
        <!-- Layers -->
        <button class="btn btn-ghost btn-sm" on:click={() => showLayersPanel = !showLayersPanel}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
          </svg>
          레이어
        </button>
        
        <!-- Page Management -->
        <button class="btn btn-ghost btn-sm" on:click={() => showPagePanel = !showPagePanel}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          페이지
        </button>
        
        <div class="divider divider-horizontal mx-2"></div>
        
        <!-- Help -->
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-ghost btn-sm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </label>
          <div tabindex="0" class="dropdown-content bg-base-100 rounded-box z-[1] w-64 p-4 shadow-lg">
            <h3 class="font-bold mb-2">키보드 단축키</h3>
            <table class="table table-compact w-full">
              <tbody>
                <tr><td class="text-xs">Ctrl+Z</td><td class="text-xs">실행 취소</td></tr>
                <tr><td class="text-xs">Ctrl+Y</td><td class="text-xs">다시 실행</td></tr>
                <tr><td class="text-xs">Ctrl+C</td><td class="text-xs">복사</td></tr>
                <tr><td class="text-xs">Ctrl+V</td><td class="text-xs">붙여넣기</td></tr>
                <tr><td class="text-xs">Delete</td><td class="text-xs">삭제</td></tr>
                <tr><td class="text-xs">Ctrl+A</td><td class="text-xs">전체 선택</td></tr>
                <tr><td class="text-xs">스페이스바</td><td class="text-xs">팬 모드</td></tr>
                <tr><td class="text-xs">마우스 휠</td><td class="text-xs">확대/축소</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Save -->
        <button class="btn btn-ghost btn-sm" on:click={saveProject}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
          저장
        </button>
        
        <!-- Export -->
        <div class="dropdown dropdown-end">
          <label tabindex="0" class="btn btn-primary btn-sm whitespace-nowrap">
            <svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            내보내기
          </label>
          <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-48 p-2 shadow-lg">
            <li><button on:click={exportAsPDF}>PDF로 내보내기</button></li>
            <li><button on:click={() => exportAsImage('png')}>PNG로 내보내기</button></li>
            <li><button on:click={() => exportAsImage('jpeg')}>JPEG로 내보내기</button></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Main Editor Area -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Left Toolbar -->
    <div class="w-24 bg-base-100 shadow-md flex flex-col items-center py-4 space-y-2 relative">
      {#each tools as tool}
        <div class="relative">
          <button 
            class="btn btn-ghost h-auto flex-col gap-1 px-2 py-2 w-20 {selectedTool === tool.id ? 'btn-active' : ''}"
            on:click={() => selectTool(tool.id)}
            title={tool.name}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tool.icon}></path>
            </svg>
            <span class="text-xs">{tool.name}</span>
          </button>
          
          <!-- Shape Menu -->
          {#if showShapeMenu && selectedTool === 'shape' && tool.id === 'shape'}
            <div class="absolute left-full top-0 ml-2 bg-base-100 shadow-lg rounded-lg p-2 w-48 z-10">
              <div class="grid grid-cols-2 gap-1">
                {#each shapeTypes as shape}
                  <button 
                    class="btn btn-ghost btn-sm h-auto flex-col gap-1 py-2"
                    on:click={() => selectShape(shape)}
                  >
                    <span class="text-2xl">{shape.icon}</span>
                    <span class="text-xs">{shape.name}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
    
    <!-- Canvas Area -->
    <div class="flex-1 overflow-auto bg-gray-200 relative">
      <div class="flex items-center justify-center min-h-full p-8">
        <div class="inline-block bg-white shadow-xl relative">
          <canvas 
            bind:this={canvasElement}
            class="{selectedTool !== 'select' ? 'cursor-crosshair' : ''}"
          ></canvas>
          
          <!-- Tool indicator -->
          {#if selectedTool !== 'select'}
            <div class="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
              {#if selectedTool === 'text'}
                텍스트 도구 - 클릭하여 텍스트 추가
              {:else if selectedTool === 'shape' && selectedShape}
                {selectedShape.name} 도구 - 드래그하여 그리기
              {:else}
                도구 선택됨
              {/if}
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Zoom Controls -->
      <div class="absolute bottom-4 right-4 bg-base-100 rounded-lg shadow-lg p-2 flex items-center gap-2">
        <button 
          class="btn btn-ghost btn-xs"
          on:click={zoomOut}
          title="축소 (Ctrl+-)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
          </svg>
        </button>
        
        <button 
          class="btn btn-ghost btn-xs min-w-[60px]"
          on:click={resetZoom}
          title="100%로 재설정"
        >
          {zoom}%
        </button>
        
        <button 
          class="btn btn-ghost btn-xs"
          on:click={zoomIn}
          title="확대 (Ctrl++)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
        </button>
        
        <button 
          class="btn btn-ghost btn-xs"
          on:click={fitToWidth}
          title="폭 맞춤"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
          </svg>
        </button>
        
        <div class="divider divider-horizontal mx-0"></div>
        
        <button 
          class="btn btn-ghost btn-xs {showGrid ? 'btn-active' : ''}"
          on:click={toggleGrid}
          title="격자 표시"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16M6 4v16m6-16v16m6-16v16"></path>
          </svg>
        </button>
      </div>
      
      <!-- Pan Mode Indicator -->
      {#if isPanning}
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/75 text-white px-4 py-2 rounded-full pointer-events-none">
          팬 모드 - 드래그하여 이동 (스페이스바를 놓으면 종료)
        </div>
      {/if}
      
      <!-- Page Management Panel -->
      {#if showPagePanel}
        <div class="absolute top-4 left-4 bg-base-100 shadow-lg rounded-lg p-4 w-64 max-h-96 overflow-y-auto">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold">페이지 관리</h3>
            <button class="btn btn-ghost btn-xs" on:click={() => showPagePanel = false}>✕</button>
          </div>
          
          <div class="space-y-2">
            {#each projectData.pages as page}
              <div class="card card-compact bg-base-200 {page.id === currentPage.id ? 'ring-2 ring-primary' : ''}">
                <div class="card-body">
                  <div class="flex items-center justify-between">
                    <button 
                      class="text-left flex-1"
                      on:click={() => switchToPage(page.id)}
                    >
                      <h4 class="font-medium">{page.name}</h4>
                      <p class="text-xs text-base-content/60">{page.objects?.length || 0}개 객체</p>
                    </button>
                    <div class="dropdown dropdown-end">
                      <div tabindex="0" role="button" class="btn btn-ghost btn-xs">⋮</div>
                      <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow">
                        <li><button on:click={() => duplicatePage(page.id)}>복제</button></li>
                        <li><button on:click={() => deletePage(page.id)}>삭제</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          
          <button class="btn btn-primary btn-sm w-full mt-4" on:click={addNewPage}>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            새 페이지 추가
          </button>
        </div>
      {/if}
      
      <!-- Layers Panel -->
      {#if showLayersPanel}
        <div class="absolute bottom-4 left-4 bg-base-100 shadow-lg rounded-lg p-4 w-64 max-h-96">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold">레이어</h3>
            <button class="btn btn-ghost btn-xs" on:click={() => showLayersPanel = false}>✕</button>
          </div>
          
          <div class="space-y-1 overflow-y-auto" style="max-height: 300px;">
            {#if canvas}
              {#each canvas.getObjects().reverse() as obj, index}
                <div 
                  class="flex items-center gap-2 p-2 rounded hover:bg-base-200 cursor-pointer {selectedObject === obj ? 'bg-primary/20' : ''}"
                  on:click={() => {
                    canvas.setActiveObject(obj);
                    canvas.renderAll();
                  }}
                >
                  <button 
                    class="btn btn-ghost btn-xs"
                    on:click|stopPropagation={() => {
                      obj.visible = !obj.visible;
                      canvas.renderAll();
                    }}
                  >
                    {#if obj.visible}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                      </svg>
                    {/if}
                  </button>
                  
                  <button 
                    class="btn btn-ghost btn-xs"
                    on:click|stopPropagation={() => {
                      obj.selectable = !obj.selectable;
                      obj.evented = !obj.evented;
                      canvas.renderAll();
                    }}
                  >
                    {#if obj.selectable}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                      </svg>
                    {:else}
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                      </svg>
                    {/if}
                  </button>
                  
                  <div class="flex-1 text-sm truncate">
                    {#if obj.type === 'textbox'}
                      텍스트: {obj.text.substring(0, 20)}...
                    {:else if obj.type === 'rect'}
                      사각형
                    {:else if obj.type === 'circle'}
                      원
                    {:else if obj.type === 'triangle'}
                      삼각형
                    {:else if obj.type === 'line'}
                      선
                    {:else if obj.type === 'group'}
                      그룹
                    {:else if obj.type === 'image'}
                      이미지
                    {:else if obj.type === 'polygon'}
                      별
                    {:else}
                      {obj.type}
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Right Properties Panel -->
    <div class="w-64 bg-base-100 shadow-md p-4 overflow-y-auto">
      <h3 class="font-bold mb-4">속성</h3>
      
      {#if selectedObject}
        <div class="space-y-4">
          <!-- Alignment Tools -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">정렬</span>
            </label>
            <div class="grid grid-cols-3 gap-1">
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('left')}
                title="왼쪽 정렬"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M3 6h12M3 18h15"></path>
                </svg>
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('center-h')}
                title="가로 중앙 정렬"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16M7 6h10M6 18h12"></path>
                </svg>
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('right')}
                title="오른쪽 정렬"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12H3m18-6H9m12 12H6"></path>
                </svg>
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('top')}
                title="상단 정렬"
              >
                <svg class="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12h18M3 6h12M3 18h15"></path>
                </svg>
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('center-v')}
                title="세로 중앙 정렬"
              >
                <svg class="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16M7 6h10M6 18h12"></path>
                </svg>
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={() => alignObjects('bottom')}
                title="하단 정렬"
              >
                <svg class="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12H3m18-6H9m12 12H6"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Distribute -->
          {#if selectedObject.type === 'activeSelection' && selectedObject.getObjects().length > 2}
            <div class="form-control">
              <label class="label">
                <span class="label-text">분배</span>
              </label>
              <div class="flex gap-1">
                <button 
                  class="btn btn-ghost btn-xs flex-1"
                  on:click={() => distributeObjects('horizontal')}
                  title="가로 균등 분배"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5v14M8 5v14m4-14v14m4 0V5m4 0v14"></path>
                  </svg>
                </button>
                <button 
                  class="btn btn-ghost btn-xs flex-1"
                  on:click={() => distributeObjects('vertical')}
                  title="세로 균등 분배"
                >
                  <svg class="w-4 h-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5v14M8 5v14m4-14v14m4 0V5m4 0v14"></path>
                  </svg>
                </button>
              </div>
            </div>
          {/if}
          
          <!-- Arrange -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">순서</span>
            </label>
            <div class="grid grid-cols-2 gap-1">
              <button 
                class="btn btn-ghost btn-xs"
                on:click={bringToFront}
                title="맨 앞으로"
              >
                맨 앞으로
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={bringForward}
                title="앞으로"
              >
                앞으로
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={sendBackward}
                title="뒤로"
              >
                뒤로
              </button>
              <button 
                class="btn btn-ghost btn-xs"
                on:click={sendToBack}
                title="맨 뒤로"
              >
                맨 뒤로
              </button>
            </div>
          </div>
          
          <!-- Group/Ungroup -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">그룹</span>
            </label>
            {#if selectedObject.type === 'activeSelection'}
              <button 
                class="btn btn-primary btn-sm w-full"
                on:click={groupObjects}
              >
                그룹 만들기
              </button>
            {:else if selectedObject.type === 'group'}
              <button 
                class="btn btn-secondary btn-sm w-full"
                on:click={ungroupObjects}
              >
                그룹 해제
              </button>
            {/if}
          </div>
          
          <div class="divider"></div>
          <!-- Position -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">위치</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                class="input input-bordered input-sm" 
                placeholder="X" 
                value={Math.round(selectedObject.left)}
                on:input={(e) => {
                  selectedObject.set('left', parseInt(e.target.value));
                  canvas.renderAll();
                }}
              />
              <input 
                type="number" 
                class="input input-bordered input-sm" 
                placeholder="Y"
                value={Math.round(selectedObject.top)}
                on:input={(e) => {
                  selectedObject.set('top', parseInt(e.target.value));
                  canvas.renderAll();
                }}
              />
            </div>
          </div>
          
          <!-- Size -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">크기</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                class="input input-bordered input-sm" 
                placeholder="너비"
                value={Math.round(selectedObject.width * selectedObject.scaleX)}
                on:input={(e) => {
                  const newWidth = parseInt(e.target.value);
                  selectedObject.set('scaleX', newWidth / selectedObject.width);
                  canvas.renderAll();
                }}
              />
              <input 
                type="number" 
                class="input input-bordered input-sm" 
                placeholder="높이"
                value={Math.round(selectedObject.height * selectedObject.scaleY)}
                on:input={(e) => {
                  const newHeight = parseInt(e.target.value);
                  selectedObject.set('scaleY', newHeight / selectedObject.height);
                  canvas.renderAll();
                }}
              />
            </div>
          </div>
          
          <!-- Rotation -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">회전</span>
            </label>
            <input 
              type="range" 
              min="-180" 
              max="180" 
              class="range range-sm"
              value={selectedObject.angle}
              on:input={(e) => {
                selectedObject.set('angle', parseInt(e.target.value));
                canvas.renderAll();
              }}
            />
            <div class="text-xs text-center mt-1">{Math.round(selectedObject.angle)}°</div>
          </div>
          
          <!-- Fill Color -->
          {#if selectedObject.fill !== undefined}
            <div class="form-control">
              <label class="label">
                <span class="label-text">채우기 색상</span>
              </label>
              <div class="space-y-2">
                <input 
                  type="color" 
                  class="input input-bordered h-10 w-full"
                  value={selectedObject.fill || '#000000'}
                  on:input={(e) => {
                    selectedObject.set('fill', e.target.value);
                    canvas.renderAll();
                    saveState();
                  }}
                />
                <div class="grid grid-cols-8 gap-1">
                  {#each colorPresets as color}
                    <button 
                      class="w-8 h-8 rounded border-2 {selectedObject.fill === color ? 'border-primary' : 'border-base-300'}"
                      style="background-color: {color}"
                      on:click={() => {
                        selectedObject.set('fill', color);
                        canvas.renderAll();
                        saveState();
                      }}
                    />
                  {/each}
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Stroke -->
          {#if selectedObject.stroke !== undefined}
            <div class="form-control">
              <label class="label">
                <span class="label-text">테두리 색상</span>
              </label>
              <input 
                type="color" 
                class="input input-bordered h-10 w-full"
                value={selectedObject.stroke || '#000000'}
                on:input={(e) => {
                  selectedObject.set('stroke', e.target.value);
                  canvas.renderAll();
                }}
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">테두리 두께</span>
              </label>
              <input 
                type="number" 
                class="input input-bordered input-sm"
                min="0"
                max="20"
                value={selectedObject.strokeWidth || 0}
                on:input={(e) => {
                  selectedObject.set('strokeWidth', parseInt(e.target.value));
                  canvas.renderAll();
                }}
              />
            </div>
          {/if}
          
          <!-- Opacity -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">투명도</span>
              <span class="label-text-alt">{Math.round((selectedObject.opacity || 1) * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              class="range range-sm"
              value={(selectedObject.opacity || 1) * 100}
              on:input={(e) => {
                selectedObject.set('opacity', parseInt(e.target.value) / 100);
                canvas.renderAll();
              }}
            />
          </div>
          
          <!-- Shadow -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">그림자</span>
              <input 
                type="checkbox" 
                class="checkbox checkbox-sm"
                checked={selectedObject.shadow !== null}
                on:change={async (e) => {
                  if (e.target.checked) {
                    // fabric is already imported at the top
                    selectedObject.set('shadow', new fabric.Shadow({
                      color: 'rgba(0,0,0,0.3)',
                      blur: 10,
                      offsetX: 5,
                      offsetY: 5
                    }));
                  } else {
                    selectedObject.set('shadow', null);
                  }
                  canvas.renderAll();
                  saveState();
                }}
              />
            </label>
            {#if selectedObject.shadow}
              <div class="space-y-2 mt-2">
                <input 
                  type="color" 
                  class="input input-bordered h-8 w-full"
                  value={selectedObject.shadow.color || '#000000'}
                  on:input={(e) => {
                    selectedObject.shadow.color = e.target.value;
                    canvas.renderAll();
                  }}
                />
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  class="range range-xs"
                  value={selectedObject.shadow.blur || 10}
                  on:input={(e) => {
                    selectedObject.shadow.blur = parseInt(e.target.value);
                    canvas.renderAll();
                  }}
                />
              </div>
            {/if}
          </div>
          
          <!-- Stroke Style -->
          {#if selectedObject.stroke !== undefined}
            <div class="form-control">
              <label class="label">
                <span class="label-text">테두리 스타일</span>
              </label>
              <select 
                class="select select-bordered select-sm w-full"
                on:change={async (e) => {
                  const value = e.target.value;
                  if (value === 'solid') {
                    selectedObject.set('strokeDashArray', null);
                  } else if (value === 'dashed') {
                    selectedObject.set('strokeDashArray', [10, 5]);
                  } else if (value === 'dotted') {
                    selectedObject.set('strokeDashArray', [2, 2]);
                  } else if (value === 'dash-dot') {
                    selectedObject.set('strokeDashArray', [10, 5, 2, 5]);
                  }
                  canvas.renderAll();
                  saveState();
                }}
              >
                <option value="solid">실선</option>
                <option value="dashed">파선</option>
                <option value="dotted">점선</option>
                <option value="dash-dot">일점쇄선</option>
              </select>
            </div>
          {/if}
          
          <!-- Text specific properties -->
          {#if selectedObject.type === 'textbox' || selectedObject.type === 'text'}
            <div class="form-control">
              <label class="label">
                <span class="label-text">글꼴 크기</span>
              </label>
              <input 
                type="number" 
                class="input input-bordered input-sm"
                min="8"
                max="200"
                value={selectedObject.fontSize}
                on:input={(e) => {
                  selectedObject.set('fontSize', parseInt(e.target.value));
                  canvas.renderAll();
                }}
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">글꼴</span>
              </label>
              <select 
                class="select select-bordered select-sm w-full"
                value={selectedObject.fontFamily}
                on:change={(e) => {
                  selectedObject.set('fontFamily', e.target.value);
                  canvas.renderAll();
                  saveState();
                }}
              >
                {#each fontFamilies as font}
                  <option value={font.value} style="font-family: {font.value}">{font.name}</option>
                {/each}
              </select>
            </div>
            
            <!-- Text Style Buttons -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">스타일</span>
              </label>
              <div class="btn-group btn-group-sm">
                <button 
                  class="btn {selectedObject.fontWeight === 'bold' ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold');
                    canvas.renderAll();
                    saveState();
                  }}
                >
                  <span class="font-bold">B</span>
                </button>
                <button 
                  class="btn {selectedObject.fontStyle === 'italic' ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic');
                    canvas.renderAll();
                    saveState();
                  }}
                >
                  <span class="italic">I</span>
                </button>
                <button 
                  class="btn {selectedObject.underline ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('underline', !selectedObject.underline);
                    canvas.renderAll();
                    saveState();
                  }}
                >
                  <span class="underline">U</span>
                </button>
              </div>
            </div>
            
            <!-- Line Height -->
            <div class="form-control">
              <label class="label">
                <span class="label-text">줄 간격</span>
                <span class="label-text-alt">{selectedObject.lineHeight || 1.16}</span>
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="3" 
                step="0.1"
                class="range range-sm"
                value={selectedObject.lineHeight || 1.16}
                on:input={(e) => {
                  selectedObject.set('lineHeight', parseFloat(e.target.value));
                  canvas.renderAll();
                }}
              />
            </div>
            
            <div class="form-control">
              <label class="label">
                <span class="label-text">정렬</span>
              </label>
              <div class="btn-group btn-group-sm w-full">
                <button 
                  class="btn {selectedObject.textAlign === 'left' ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('textAlign', 'left');
                    canvas.renderAll();
                  }}
                >
                  왼쪽
                </button>
                <button 
                  class="btn {selectedObject.textAlign === 'center' ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('textAlign', 'center');
                    canvas.renderAll();
                  }}
                >
                  가운데
                </button>
                <button 
                  class="btn {selectedObject.textAlign === 'right' ? 'btn-active' : ''}"
                  on:click={() => {
                    selectedObject.set('textAlign', 'right');
                    canvas.renderAll();
                  }}
                >
                  오른쪽
                </button>
              </div>
            </div>
          {/if}
          
          <!-- Image Filters -->
          {#if selectedObject.type === 'image'}
            <div class="form-control">
              <label class="label">
                <span class="label-text">필터</span>
              </label>
              <div class="space-y-2">
                <button 
                  class="btn btn-ghost btn-sm w-full justify-start"
                  on:click={() => {
                    selectedObject.filters = [];
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                >
                  원본
                </button>
                <button 
                  class="btn btn-ghost btn-sm w-full justify-start"
                  on:click={async () => {
                    // fabric is already imported at the top
                    selectedObject.filters = [new fabric.Image.filters.Grayscale()];
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                >
                  흑백
                </button>
                <button 
                  class="btn btn-ghost btn-sm w-full justify-start"
                  on:click={async () => {
                    // fabric is already imported at the top
                    selectedObject.filters = [new fabric.Image.filters.Sepia()];
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                >
                  세피아
                </button>
                <button 
                  class="btn btn-ghost btn-sm w-full justify-start"
                  on:click={async () => {
                    // fabric is already imported at the top
                    selectedObject.filters = [new fabric.Image.filters.Invert()];
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                >
                  반전
                </button>
              </div>
              
              <!-- Brightness -->
              <div class="mt-4">
                <label class="label">
                  <span class="label-text">밝기</span>
                  <span class="label-text-alt">0</span>
                </label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value="0"
                  class="range range-xs"
                  on:input={async (e) => {
                    // fabric is already imported at the top
                    const brightness = parseInt(e.target.value) / 100;
                    const brightnessFilter = selectedObject.filters.find(f => f.type === 'Brightness');
                    
                    if (brightnessFilter) {
                      brightnessFilter.brightness = brightness;
                    } else if (brightness !== 0) {
                      selectedObject.filters.push(new fabric.Image.filters.Brightness({ brightness }));
                    }
                    
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                />
              </div>
              
              <!-- Contrast -->
              <div class="mt-2">
                <label class="label">
                  <span class="label-text">대비</span>
                  <span class="label-text-alt">0</span>
                </label>
                <input 
                  type="range" 
                  min="-100" 
                  max="100" 
                  value="0"
                  class="range range-xs"
                  on:input={async (e) => {
                    // fabric is already imported at the top
                    const contrast = parseInt(e.target.value) / 100;
                    const contrastFilter = selectedObject.filters.find(f => f.type === 'Contrast');
                    
                    if (contrastFilter) {
                      contrastFilter.contrast = contrast;
                    } else if (contrast !== 0) {
                      selectedObject.filters.push(new fabric.Image.filters.Contrast({ contrast }));
                    }
                    
                    selectedObject.applyFilters();
                    canvas.renderAll();
                  }}
                />
              </div>
            </div>
          {/if}
          
          <!-- Opacity -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">투명도</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              class="range range-sm"
              value={selectedObject.opacity * 100}
              on:input={(e) => {
                selectedObject.set('opacity', parseInt(e.target.value) / 100);
                canvas.renderAll();
              }}
            />
            <div class="text-xs text-center mt-1">{Math.round(selectedObject.opacity * 100)}%</div>
          </div>
          
          <!-- Actions -->
          <div class="divider"></div>
          <div class="space-y-2">
            <button 
              class="btn btn-sm btn-block"
              on:click={() => {
                canvas.bringForward(selectedObject);
                canvas.renderAll();
              }}
            >
              앞으로 가져오기
            </button>
            <button 
              class="btn btn-sm btn-block"
              on:click={() => {
                canvas.sendBackwards(selectedObject);
                canvas.renderAll();
              }}
            >
              뒤로 보내기
            </button>
            <button 
              class="btn btn-sm btn-block btn-error"
              on:click={deleteSelected}
            >
              삭제
            </button>
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

<!-- Math Editor Modal -->
{#if showMathEditor}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">수식 편집기</h3>
      <div class="form-control">
        <label class="label">
          <span class="label-text">LaTeX 수식 입력</span>
        </label>
        <textarea 
          class="textarea textarea-bordered h-32" 
          placeholder={'예: \\frac{a}{b} = \\sqrt{c^2 + d^2}'}
        ></textarea>
      </div>
      <div class="mt-4 p-4 bg-base-200 rounded">
        <p class="text-sm text-base-content/60">미리보기:</p>
        <div class="mt-2 text-center">
          <span class="text-lg">수식 렌더링 미리보기</span>
        </div>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showMathEditor = false}>취소</button>
        <button class="btn btn-primary" on:click={() => insertMathFormula(String.raw`\frac{a}{b}`)}>삽입</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showMathEditor = false}>close</button>
    </form>
  </div>
{/if}

<!-- Chart Editor Modal -->
{#if showChartEditor}
  <div class="modal modal-open">
    <div class="modal-box max-w-2xl">
      <h3 class="font-bold text-lg mb-4">차트/그래프 만들기</h3>
      <div class="tabs tabs-bordered">
        <a class="tab" class:tab-active={chartType === 'bar'} on:click={() => chartType = 'bar'}>막대 그래프</a>
        <a class="tab" class:tab-active={chartType === 'line'} on:click={() => chartType = 'line'}>선 그래프</a>
        <a class="tab" class:tab-active={chartType === 'pie'} on:click={() => chartType = 'pie'}>원 그래프</a>
        <a class="tab" class:tab-active={chartType === 'scatter'} on:click={() => chartType = 'scatter'}>산점도</a>
      </div>
      <div class="mt-4 space-y-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">차트 제목</span>
          </label>
          <input type="text" class="input input-bordered" placeholder="차트 제목 입력" bind:value={chartTitle} />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">데이터 입력</span>
          </label>
          <textarea 
            class="textarea textarea-bordered h-24" 
            placeholder="라벨1, 값1&#10;라벨2, 값2&#10;..."
            bind:value={chartData}
          ></textarea>
        </div>
        <div class="p-4 bg-base-200 rounded h-48 flex items-center justify-center">
          <span class="text-base-content/60">차트 미리보기 영역</span>
        </div>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showChartEditor = false}>취소</button>
        <button class="btn btn-primary" on:click={insertChart}>삽입</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showChartEditor = false}>close</button>
    </form>
  </div>
{/if}

<!-- Question Bank Modal -->
{#if showQuestionBank}
  <div class="modal modal-open">
    <div class="modal-box max-w-4xl">
      <h3 class="font-bold text-lg mb-4">문제 은행에서 가져오기</h3>
      <div class="flex gap-4">
        <!-- Categories -->
        <div class="w-48">
          <h4 class="font-medium mb-2">카테고리</h4>
          <ul class="menu bg-base-200 rounded-box">
            <li><a class="active">전체</a></li>
            <li><a>수학</a></li>
            <li><a>과학</a></li>
            <li><a>국어</a></li>
            <li><a>영어</a></li>
          </ul>
        </div>
        <!-- Question List -->
        <div class="flex-1">
          <div class="form-control mb-4">
            <input type="text" placeholder="문제 검색..." class="input input-bordered" />
          </div>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            {#each [1, 2, 3, 4, 5] as i}
              <div class="card card-compact bg-base-200">
                <div class="card-body">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" class="checkbox" 
                      checked={selectedQuestions.has(`question-${i}`)}
                      on:change={() => toggleQuestionSelection(`question-${i}`)} />
                    <div class="flex-1">
                      <h4 class="font-medium">문제 {i}</h4>
                      <p class="text-sm text-base-content/70">이차방정식의 해를 구하는 문제입니다...</p>
                      <div class="flex gap-2 mt-1">
                        <span class="badge badge-sm">중3</span>
                        <span class="badge badge-sm badge-warning">중</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showQuestionBank = false}>취소</button>
        <button class="btn btn-primary" on:click={insertQuestionBlock}>선택한 문제 삽입</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button on:click={() => showQuestionBank = false}>close</button>
    </form>
  </div>
{/if}

<!-- Context Menu -->
{#if showContextMenu}
  <div 
    class="fixed bg-base-100 shadow-xl rounded-lg py-2 z-50 min-w-[160px]"
    style="left: {contextMenuX}px; top: {contextMenuY}px;"
  >
    <ul class="menu menu-compact">
      {#if contextMenuTarget}
        <li><button on:click={() => { copy(); showContextMenu = false; }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          복사
        </button></li>
        <li><button on:click={() => { copy(); deleteSelected(); showContextMenu = false; }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
          </svg>
          잘라내기
        </button></li>
        <li><button on:click={() => { deleteSelected(); showContextMenu = false; }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          삭제
        </button></li>
        <div class="divider my-1"></div>
        <li><button on:click={() => { bringToFront(); showContextMenu = false; }}>맨 앞으로</button></li>
        <li><button on:click={() => { bringForward(); showContextMenu = false; }}>앞으로</button></li>
        <li><button on:click={() => { sendBackward(); showContextMenu = false; }}>뒤로</button></li>
        <li><button on:click={() => { sendToBack(); showContextMenu = false; }}>맨 뒤로</button></li>
        {#if contextMenuTarget.type === 'activeSelection'}
          <div class="divider my-1"></div>
          <li><button on:click={() => { groupObjects(); showContextMenu = false; }}>그룹 만들기</button></li>
        {:else if contextMenuTarget.type === 'group'}
          <div class="divider my-1"></div>
          <li><button on:click={() => { ungroupObjects(); showContextMenu = false; }}>그룹 해제</button></li>
        {/if}
      {:else}
        <li><button on:click={() => { paste(); showContextMenu = false; }}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          붙여넣기
        </button></li>
        <li><button on:click={() => { canvas.discardActiveObject(); const sel = new fabric.ActiveSelection(canvas.getObjects(), { canvas: canvas }); canvas.setActiveObject(sel); canvas.requestRenderAll(); showContextMenu = false; }}>
          전체 선택
        </button></li>
      {/if}
    </ul>
  </div>
{/if}

<style>
  /* Custom styles for the editor */
  :global(.canvas-container) {
    margin: 0 auto;
  }
  
  .cursor-crosshair {
    cursor: crosshair !important;
  }
  
  /* Override fabric.js cursor styles when in drawing mode */
  :global(.upper-canvas.cursor-crosshair) {
    cursor: crosshair !important;
  }
</style>