// Fabric will be imported dynamically when needed
let fabric = null;

// Function to set fabric instance
export function setFabricInstance(fabricInstance) {
  fabric = fabricInstance;
}

// Function to ensure fabric is loaded
export async function ensureFabricLoaded() {
  if (!fabric && typeof window !== 'undefined') {
    try {
      const fabricModule = await import('fabric');
      fabric = fabricModule.fabric || fabricModule;
    } catch (error) {
      console.error('Failed to load fabric.js:', error);
    }
  }
  return fabric;
}

// Paper sizes in pixels (72 DPI)
export const PAPER_SIZES = {
  A4: { width: 595, height: 842 },
  A3: { width: 842, height: 1191 },
  B4: { width: 729, height: 1032 },
  B3: { width: 1032, height: 1460 }
};

// Default margins in pixels
export const MARGINS = {
  top: 72,
  bottom: 72,
  left: 54,
  right: 54
};

// Grid settings
export const GRID_SIZE = 20;

// Font settings
export const FONT_SIZES = {
  small: 10,
  medium: 12,
  large: 14,
  title: 18,
  subtitle: 16
};

// Convert block to canvas object
export function convertBlockToCanvasObject(block, formatOptions, position = { x: 0, y: 0 }) {
  // Return early if in SSR environment
  if (typeof window === 'undefined') {
    return { object: null, height: 0 };
  }
  
  if (!fabric) {
    console.warn('Fabric.js not loaded, cannot convert block to canvas object');
    return { object: null, height: 0 };
  }
  
  const style = getBlockStyle(block, formatOptions);
  
  switch (block.type) {
    case 'question':
      return createQuestionObject(block, style, formatOptions, position);
    case 'passage':
      return createPassageObject(block, style, formatOptions, position);
    case 'concept':
      return createConceptObject(block, style, formatOptions, position);
    case 'explanation':
      return createExplanationObject(block, style, formatOptions, position);
    default:
      return createTextObject(block.content || '', style, position);
  }
}

// Load and add image to canvas (async)
export async function loadImageToCanvas(imageUrl, position, size, canvas) {
  // Return early if in SSR environment
  if (typeof window === 'undefined') {
    return Promise.resolve(null);
  }
  
  if (!fabric) {
    console.warn('Fabric.js not loaded, cannot load image to canvas');
    return Promise.resolve(null);
  }
  
  return new Promise((resolve) => {
    fabric.Image.fromURL(imageUrl, function(img) {
      if (img && img.width && img.height) {
        // Scale image to fit size
        const maxWidth = size.width;
        const maxHeight = size.height;
        let scale = maxWidth / img.width;
        
        if (img.height * scale > maxHeight) {
          scale = maxHeight / img.height;
        }
        
        img.set({
          left: position.x,
          top: position.y,
          scaleX: scale,
          scaleY: scale,
          selectable: true
        });
        
        if (canvas) {
          canvas.add(img);
          canvas.renderAll();
        }
        
        resolve(img);
      } else {
        resolve(null);
      }
    }, {
      crossOrigin: 'anonymous'
    });
  });
}

// Get style based on block type and format options
function getBlockStyle(block, formatOptions) {
  const fontSize = FONT_SIZES[formatOptions.fontSize || 'medium'];
  const baseStyle = {
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: fontSize,
    fill: '#000000',
    lineHeight: 1.6
  };
  
  switch (block.type) {
    case 'question':
      return {
        ...baseStyle,
        fontWeight: 'normal'
      };
    case 'passage':
      return {
        ...baseStyle,
        fill: '#333333',
        backgroundColor: '#f5f5f5',
        padding: 10
      };
    case 'concept':
      return {
        ...baseStyle,
        fontWeight: 'bold',
        fill: '#1a73e8'
      };
    case 'explanation':
      return {
        ...baseStyle,
        fontSize: fontSize - 2,
        fill: '#666666',
        fontStyle: 'italic'
      };
    default:
      return baseStyle;
  }
}

// Create question object
function createQuestionObject(block, style, formatOptions, position) {
  const objects = [];
  const { x, y } = position;
  let currentY = y;
  
  console.log('Creating question object:', block);
  console.log('Image URL:', block.config?.imageUrl);
  
  // Question number or title
  const questionNumber = block.config?.questionNumber || block.index || '1';
  const questionTitle = block.title || `${questionNumber}.`;
  const numberText = new fabric.Text(questionTitle.includes('.') ? questionTitle : `${questionTitle}.`, {
    ...style,
    left: x,
    top: currentY,
    fontWeight: 'bold'
  });
  objects.push(numberText);
  
  // Question content (only if there's text content)
  const contentWidth = (formatOptions.columns === 2) ? 250 : 500;
  if (block.content && block.content.trim() !== '') {
    const questionText = new fabric.Textbox(block.content, {
      ...style,
      left: x + 30,
      top: currentY,
      width: contentWidth,
      editable: true
    });
    objects.push(questionText);
    currentY += questionText.height + 10;
  }
  
  // Add image if exists
  if (block.config && block.config.imageUrl) {
    console.log('Creating image placeholder for:', block.config.imageUrl);
    
    // Create a simple rectangle as placeholder with metadata
    const imagePlaceholder = new fabric.Rect({
      left: x + 30,  // Absolute position for ungrouped object
      top: currentY,  // Absolute position
      width: contentWidth,
      height: 200,
      fill: '#f0f0f0',
      stroke: '#cccccc',
      strokeWidth: 1,
      // Store image URL and position info for later loading
      imageUrl: block.config.imageUrl,
      isImagePlaceholder: true,
      imagePosition: { x: x + 30, y: currentY, width: contentWidth, height: 200 }
    });
    
    // For grouped objects, adjust position
    if (objects.length > 0) {
      imagePlaceholder.set({
        left: 30,  // Relative to group
        top: currentY - y  // Relative to group
      });
      imagePlaceholder.imagePosition = { x: 30, y: currentY - y, width: contentWidth, height: 200 };
    }
    
    objects.push(imagePlaceholder);
    currentY += 210; // Add space for image
  }
  
  // Difficulty indicator
  if (formatOptions.showDifficulty !== 'none' && block.difficulty) {
    const difficultyText = formatOptions.showDifficulty === 'text' 
      ? `난이도: ${getDifficultyLabel(block.difficulty)}`
      : getDifficultyStars(block.difficulty);
    
    const difficultyObj = new fabric.Text(difficultyText, {
      ...style,
      fontSize: style.fontSize - 2,
      fill: '#666666',
      left: x + 30,
      top: currentY
    });
    objects.push(difficultyObj);
    currentY += 20;
  }
  
  // Multiple choice options
  if (block.subtype === 'multiple_choice' && block.options) {
    block.options.forEach((option, index) => {
      const optionText = new fabric.Text(`${index + 1}) ${option}`, {
        ...style,
        left: x + 40,
        top: currentY
      });
      objects.push(optionText);
      currentY += 25;
    });
  }
  
  // Answer area for short answer/essay
  if (block.subtype === 'short_answer' || block.subtype === 'essay') {
    const answerLines = block.subtype === 'essay' ? 5 : 2;
    for (let i = 0; i < answerLines; i++) {
      const line = new fabric.Line([x + 30, currentY, x + 30 + contentWidth, currentY], {
        stroke: '#cccccc',
        strokeWidth: 1
      });
      objects.push(line);
      currentY += 20;
    }
  }
  
  // Source information
  if (formatOptions.showSources && block.material_title) {
    const sourceText = new fabric.Text(`[출처: ${block.material_title}]`, {
      ...style,
      fontSize: style.fontSize - 2,
      fill: '#999999',
      left: formatOptions.sourcePosition === 'right' ? x + contentWidth - 100 : x + 30,
      top: currentY
    });
    objects.push(sourceText);
    currentY += 20;
  }
  
  // Question spacing
  const spacing = {
    narrow: 10,
    normal: 20,
    wide: 40
  };
  currentY += spacing[formatOptions.questionSpacing || 'normal'];
  
  // Group all objects
  const group = new fabric.Group(objects, {
    left: x,
    top: y,
    selectable: true
  });
  
  return { object: group, height: currentY - y };
}

// Create passage object
function createPassageObject(block, style, formatOptions, position) {
  const { x, y } = position;
  const contentWidth = (formatOptions.columns === 2) ? 250 : 500;
  
  // Background rectangle
  const background = new fabric.Rect({
    left: x,
    top: y,
    width: contentWidth + 20,
    height: 100, // Will be adjusted
    fill: '#f5f5f5',
    stroke: '#e0e0e0',
    strokeWidth: 1,
    rx: 5,
    ry: 5
  });
  
  // Passage text
  const passageText = new fabric.Textbox(block.content || '', {
    ...style,
    left: x + 10,
    top: y + 10,
    width: contentWidth,
    editable: true
  });
  
  // Adjust background height
  background.set('height', passageText.height + 20);
  
  const group = new fabric.Group([background, passageText], {
    left: x,
    top: y,
    selectable: true
  });
  
  return { object: group, height: background.height + 20 };
}

// Create concept object
function createConceptObject(block, style, formatOptions, position) {
  const { x, y } = position;
  const contentWidth = (formatOptions.columns === 2) ? 250 : 500;
  
  // Title
  const titleText = new fabric.Text('💡 핵심 개념', {
    ...style,
    fontWeight: 'bold',
    fontSize: style.fontSize + 2,
    left: x,
    top: y
  });
  
  // Content
  const conceptText = new fabric.Textbox(block.content || '', {
    ...style,
    left: x,
    top: y + 30,
    width: contentWidth,
    editable: true
  });
  
  const group = new fabric.Group([titleText, conceptText], {
    left: x,
    top: y,
    selectable: true
  });
  
  return { object: group, height: conceptText.height + 50 };
}

// Create explanation object
function createExplanationObject(block, style, formatOptions, position) {
  const { x, y } = position;
  const contentWidth = (formatOptions.columns === 2) ? 250 : 500;
  
  // Border
  const border = new fabric.Rect({
    left: x,
    top: y,
    width: contentWidth + 10,
    height: 80, // Will be adjusted
    fill: 'transparent',
    stroke: '#1a73e8',
    strokeWidth: 1,
    strokeDashArray: [5, 5],
    rx: 3,
    ry: 3
  });
  
  // Label
  const labelBg = new fabric.Rect({
    left: x + 10,
    top: y - 10,
    width: 40,
    height: 20,
    fill: '#ffffff'
  });
  
  const labelText = new fabric.Text('해설', {
    ...style,
    fontSize: style.fontSize - 2,
    fill: '#1a73e8',
    fontWeight: 'bold',
    left: x + 15,
    top: y - 8
  });
  
  // Content
  const explanationText = new fabric.Textbox(block.content || '', {
    ...style,
    left: x + 5,
    top: y + 15,
    width: contentWidth,
    editable: true
  });
  
  // Adjust border height
  border.set('height', explanationText.height + 30);
  
  const group = new fabric.Group([border, labelBg, labelText, explanationText], {
    left: x,
    top: y + 10,
    selectable: true
  });
  
  return { object: group, height: border.height + 30 };
}

// Create simple text object
function createTextObject(content, style, position) {
  const text = new fabric.Textbox(content, {
    ...style,
    left: position.x,
    top: position.y,
    width: 500,
    editable: true
  });
  
  return { object: text, height: text.height + 10 };
}

// Calculate grid layout for blocks
export function calculateGridLayout(blocks, pageSize, formatOptions) {
  // Return early if in SSR environment
  if (typeof window === 'undefined') {
    return [];
  }
  
  if (!fabric) {
    console.warn('Fabric.js not loaded, cannot calculate grid layout');
    return [];
  }
  
  const paperSize = PAPER_SIZES[pageSize] || PAPER_SIZES.A4;
  const workArea = {
    width: paperSize.width - MARGINS.left - MARGINS.right,
    height: paperSize.height - MARGINS.top - MARGINS.bottom
  };
  
  const columns = formatOptions.columns || 1;
  const columnWidth = workArea.width / columns;
  const columnGap = 20;
  
  const pages = [];
  let currentPage = { objects: [] };
  let currentColumn = 0;
  let currentX = MARGINS.left;
  let currentY = MARGINS.top;
  let maxColumnHeight = 0;
  
  blocks.forEach((block, index) => {
    // Add question number to config
    if (block.type === 'question') {
      block.config = { ...block.config, questionNumber: index + 1 };
    }
    
    // Convert block to canvas object
    const { object, height } = convertBlockToCanvasObject(
      block, 
      formatOptions, 
      { x: currentX, y: currentY }
    );
    
    // Skip if object is null
    if (!object) return;
    
    // Check if object fits in current column
    if (currentY + height > paperSize.height - MARGINS.bottom) {
      // Move to next column or page
      currentColumn++;
      if (currentColumn >= columns) {
        // New page
        pages.push(currentPage);
        currentPage = { objects: [] };
        currentColumn = 0;
        currentY = MARGINS.top;
        maxColumnHeight = 0;
      } else {
        // Next column
        currentY = MARGINS.top;
      }
      currentX = MARGINS.left + (currentColumn * (columnWidth + columnGap));
    }
    
    // Place object
    object.set({
      left: currentX,
      top: currentY
    });
    currentPage.objects.push(object);
    
    // Update position
    currentY += height;
    maxColumnHeight = Math.max(maxColumnHeight, currentY);
  });
  
  // Add last page
  if (currentPage.objects.length > 0) {
    pages.push(currentPage);
  }
  
  return pages;
}

// Apply grid snap
export function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

// Get difficulty label
function getDifficultyLabel(difficulty) {
  const labels = {
    very_easy: '매우 쉬움',
    easy: '쉬움',
    medium: '보통',
    hard: '어려움',
    very_hard: '매우 어려움'
  };
  return labels[difficulty] || difficulty;
}

// Get difficulty stars
function getDifficultyStars(difficulty) {
  const levels = {
    very_easy: '★☆☆☆☆',
    easy: '★★☆☆☆',
    medium: '★★★☆☆',
    hard: '★★★★☆',
    very_hard: '★★★★★'
  };
  return levels[difficulty] || '★★★☆☆';
}

// Create test header
export function createTestHeader(testInfo, pageSize) {
  // Return early if in SSR environment
  if (typeof window === 'undefined') {
    return [];
  }
  
  if (!fabric) {
    console.warn('Fabric.js not loaded, cannot create test header');
    return [];
  }
  
  const paperSize = PAPER_SIZES[pageSize] || PAPER_SIZES.A4;
  const objects = [];
  
  // Title
  const title = new fabric.Text(testInfo.title || '시험지', {
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: 20,
    fontWeight: 'bold',
    left: paperSize.width / 2,
    top: 30,
    originX: 'center'
  });
  objects.push(title);
  
  // Info line
  const infoText = [];
  if (testInfo.subject) infoText.push(`과목: ${testInfo.subject}`);
  if (testInfo.grade) infoText.push(`학년: ${testInfo.grade}`);
  if (testInfo.date) infoText.push(`일시: ${testInfo.date}`);
  if (testInfo.time) infoText.push(`시간: ${testInfo.time}분`);
  
  if (infoText.length > 0) {
    const info = new fabric.Text(infoText.join(' | '), {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: 12,
      left: paperSize.width / 2,
      top: 60,
      originX: 'center'
    });
    objects.push(info);
  }
  
  // Student info box
  const boxWidth = 200;
  const boxHeight = 25;
  const boxLeft = paperSize.width - MARGINS.right - boxWidth;
  const boxTop = 30;
  
  const studentBox = new fabric.Rect({
    left: boxLeft,
    top: boxTop,
    width: boxWidth,
    height: boxHeight,
    fill: 'transparent',
    stroke: '#000000',
    strokeWidth: 1
  });
  objects.push(studentBox);
  
  const studentLabel = new fabric.Text('이름:', {
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: 12,
    left: boxLeft + 10,
    top: boxTop + 5
  });
  objects.push(studentLabel);
  
  // Instructions
  const instructions = new fabric.Text(testInfo.instructions || '※ 문제를 잘 읽고 답안을 작성하시오.', {
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: 11,
    left: MARGINS.left,
    top: 100
  });
  objects.push(instructions);
  
  // Divider
  const divider = new fabric.Line([MARGINS.left, 120, paperSize.width - MARGINS.right, 120], {
    stroke: '#000000',
    strokeWidth: 1
  });
  objects.push(divider);
  
  return objects;
}

// Create answer sheet
export function createAnswerSheet(blocks, pageSize, formatOptions) {
  // Return early if in SSR environment
  if (typeof window === 'undefined') {
    return [];
  }
  
  if (!fabric) {
    console.warn('Fabric.js not loaded, cannot create answer sheet');
    return [];
  }
  
  const paperSize = PAPER_SIZES[pageSize] || PAPER_SIZES.A4;
  const objects = [];
  
  // Title
  const title = new fabric.Text('정답지', {
    fontFamily: 'Noto Sans KR, sans-serif',
    fontSize: 18,
    fontWeight: 'bold',
    left: paperSize.width / 2,
    top: 30,
    originX: 'center'
  });
  objects.push(title);
  
  // Answer list
  let currentY = 80;
  const questions = blocks.filter(b => b.type === 'question');
  
  questions.forEach((question, index) => {
    const answerText = `${index + 1}. ${question.correct_answer || '미정'}`;
    const answer = new fabric.Text(answerText, {
      fontFamily: 'Noto Sans KR, sans-serif',
      fontSize: 12,
      left: MARGINS.left + ((index % 2) * 250),
      top: currentY
    });
    objects.push(answer);
    
    if (index % 2 === 1) {
      currentY += 25;
    }
  });
  
  return objects;
}