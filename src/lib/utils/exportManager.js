import { jsPDF } from 'jspdf';
import { PAPER_SIZES, MARGINS } from './blockToCanvas.js';

// Dynamic import for docx to handle browser environment
let docx = null;

// Load docx library dynamically
async function loadDocx() {
  if (!docx && typeof window !== 'undefined') {
    try {
      docx = await import('docx');
    } catch (e) {
      console.warn('Failed to load docx library:', e);
      docx = null;
    }
  }
  return docx;
}

// Export as PDF
export async function exportAsPDF(canvas, pages, options = {}) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    throw new Error('exportAsPDF can only be called in browser environment');
  }
  const { 
    pageSize = 'A4',
    includeAnswerSheet = false,
    fileName = 'material.pdf'
  } = options;
  
  const paperSize = PAPER_SIZES[pageSize];
  const pdf = new jsPDF({
    orientation: paperSize.width > paperSize.height ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [paperSize.width, paperSize.height]
  });
  
  // Export each page
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    
    // Clear canvas and add page objects
    canvas.clear();
    pages[i].objects.forEach(obj => canvas.add(obj));
    canvas.renderAll();
    
    // Convert canvas to image and add to PDF
    const dataURL = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(dataURL, 'PNG', 0, 0, paperSize.width, paperSize.height);
  }
  
  // Add answer sheet if requested
  if (includeAnswerSheet && options.answerSheetObjects) {
    pdf.addPage();
    canvas.clear();
    options.answerSheetObjects.forEach(obj => canvas.add(obj));
    canvas.renderAll();
    
    const dataURL = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(dataURL, 'PNG', 0, 0, paperSize.width, paperSize.height);
  }
  
  // Save PDF
  pdf.save(fileName);
}

// Export as DOCX
export async function exportAsDOCX(blocks, formatOptions, testInfo = {}) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    throw new Error('exportAsDOCX can only be called in browser environment');
  }
  // Try to load docx library
  await loadDocx();
  
  // Check if docx is available
  if (!docx) {
    // Fallback to text export if docx is not available
    console.warn('docx library not available, falling back to text export');
    return exportAsTextFile(blocks, formatOptions, testInfo);
  }

  const { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } = docx;
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title
        new Paragraph({
          text: testInfo.title || '문서',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        
        // Test info
        ...(testInfo.subject || testInfo.grade ? [
          new Paragraph({
            children: [
              new TextRun({
                text: [
                  testInfo.subject && `과목: ${testInfo.subject}`,
                  testInfo.grade && `학년: ${testInfo.grade}`,
                  testInfo.date && `일시: ${testInfo.date}`
                ].filter(Boolean).join(' | '),
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          })
        ] : []),
        
        // Instructions
        new Paragraph({
          text: testInfo.instructions || '※ 문제를 잘 읽고 답안을 작성하시오.',
          spacing: { after: 200 }
        }),
        
        // Blocks
        ...blocks.flatMap((block, index) => {
          switch (block.type) {
            case 'question':
              return createQuestionParagraphs(block, index + 1, formatOptions);
            case 'passage':
              return createPassageParagraphs(block);
            case 'concept':
              return createConceptParagraphs(block);
            default:
              return [new Paragraph({ text: block.content || '' })];
          }
        })
      ]
    }]
  });
  
  // Generate and save
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatOptions.fileName || 'material.docx';
  a.click();
  URL.revokeObjectURL(url);
}

// Create question paragraphs for DOCX
function createQuestionParagraphs(block, number, formatOptions) {
  if (!docx) return [];
  
  const { Paragraph, TextRun, AlignmentType } = docx;
  const paragraphs = [];
  
  // Question
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${number}. `,
          bold: true
        }),
        new TextRun({
          text: block.content || ''
        })
      ],
      spacing: { after: 100 }
    })
  );
  
  // Difficulty
  if (formatOptions.showDifficulty !== 'none' && block.difficulty) {
    paragraphs.push(
      new Paragraph({
        text: `난이도: ${getDifficultyLabel(block.difficulty)}`,
        size: 20,
        color: '666666',
        spacing: { after: 100 }
      })
    );
  }
  
  // Multiple choice options
  if (block.subtype === 'multiple_choice' && block.options) {
    block.options.forEach((option, index) => {
      paragraphs.push(
        new Paragraph({
          text: `  ${index + 1}) ${option}`,
          spacing: { after: 50 }
        })
      );
    });
  }
  
  // Answer space for short answer/essay
  if (block.subtype === 'short_answer' || block.subtype === 'essay') {
    const lines = block.subtype === 'essay' ? 5 : 2;
    for (let i = 0; i < lines; i++) {
      paragraphs.push(
        new Paragraph({
          text: '_'.repeat(80),
          spacing: { after: 100 }
        })
      );
    }
  }
  
  // Source
  if (formatOptions.showSources && block.material_title) {
    paragraphs.push(
      new Paragraph({
        text: `[출처: ${block.material_title}]`,
        size: 18,
        color: '999999',
        alignment: formatOptions.sourcePosition === 'right' ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { after: 200 }
      })
    );
  }
  
  return paragraphs;
}

// Create passage paragraphs for DOCX
function createPassageParagraphs(block) {
  if (!docx) return [];
  
  const { Paragraph } = docx;
  return [
    new Paragraph({
      text: '📄 지문',
      bold: true,
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: block.content || '',
      spacing: { after: 200 },
      shading: {
        fill: 'F5F5F5'
      }
    })
  ];
}

// Create concept paragraphs for DOCX
function createConceptParagraphs(block) {
  if (!docx) return [];
  
  const { Paragraph } = docx;
  return [
    new Paragraph({
      text: '💡 핵심 개념',
      bold: true,
      size: 28,
      color: '1A73E8',
      spacing: { after: 100 }
    }),
    new Paragraph({
      text: block.content || '',
      spacing: { after: 200 }
    })
  ];
}

// Export as HWP (Korean word processor)
export async function exportAsHWP(blocks, formatOptions, testInfo = {}) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    throw new Error('exportAsHWP can only be called in browser environment');
  }
  // HWP format is complex and proprietary
  // For now, we'll create a structured text that can be copied to HWP
  
  let content = '';
  
  // Header
  content += `${testInfo.title || '문서'}\n\n`;
  if (testInfo.subject || testInfo.grade) {
    content += [
      testInfo.subject && `과목: ${testInfo.subject}`,
      testInfo.grade && `학년: ${testInfo.grade}`,
      testInfo.date && `일시: ${testInfo.date}`
    ].filter(Boolean).join(' | ') + '\n\n';
  }
  
  content += `${testInfo.instructions || '※ 문제를 잘 읽고 답안을 작성하시오.'}\n\n`;
  content += '─'.repeat(80) + '\n\n';
  
  // Blocks
  blocks.forEach((block, index) => {
    switch (block.type) {
      case 'question':
        content += `${index + 1}. ${block.content}\n`;
        if (formatOptions.showDifficulty !== 'none' && block.difficulty) {
          content += `   난이도: ${getDifficultyLabel(block.difficulty)}\n`;
        }
        if (block.subtype === 'multiple_choice' && block.options) {
          block.options.forEach((option, i) => {
            content += `   ${i + 1}) ${option}\n`;
          });
        }
        if (block.subtype === 'short_answer' || block.subtype === 'essay') {
          const lines = block.subtype === 'essay' ? 5 : 2;
          for (let i = 0; i < lines; i++) {
            content += '   ' + '_'.repeat(60) + '\n';
          }
        }
        if (formatOptions.showSources && block.material_title) {
          content += `   [출처: ${block.material_title}]\n`;
        }
        content += '\n';
        break;
        
      case 'passage':
        content += '[지문]\n';
        content += block.content + '\n\n';
        break;
        
      case 'concept':
        content += '[핵심 개념]\n';
        content += block.content + '\n\n';
        break;
        
      default:
        content += block.content + '\n\n';
    }
  });
  
  // Create and download text file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatOptions.fileName || 'material.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Export as PowerPoint presentation
export async function exportAsPPTX(blocks, formatOptions, testInfo = {}) {
  // Guard against SSR
  if (typeof window === 'undefined') {
    throw new Error('exportAsPPTX can only be called in browser environment');
  }
  // For MVP, create HTML presentation that can be converted
  const slides = [];
  
  // Title slide
  slides.push(`
    <div class="slide">
      <h1>${testInfo.title || '프레젠테이션'}</h1>
      ${testInfo.subject ? `<p>과목: ${testInfo.subject}</p>` : ''}
      ${testInfo.grade ? `<p>학년: ${testInfo.grade}</p>` : ''}
    </div>
  `);
  
  // Content slides
  let currentSlide = { questions: [] };
  const questionsPerSlide = 3;
  
  blocks.forEach((block, index) => {
    if (block.type === 'question') {
      currentSlide.questions.push(block);
      
      if (currentSlide.questions.length >= questionsPerSlide) {
        slides.push(createQuestionSlide(currentSlide.questions, formatOptions));
        currentSlide = { questions: [] };
      }
    } else {
      // Non-question blocks get their own slide
      if (currentSlide.questions.length > 0) {
        slides.push(createQuestionSlide(currentSlide.questions, formatOptions));
        currentSlide = { questions: [] };
      }
      slides.push(createContentSlide(block));
    }
  });
  
  // Add remaining questions
  if (currentSlide.questions.length > 0) {
    slides.push(createQuestionSlide(currentSlide.questions, formatOptions));
  }
  
  // Create HTML presentation
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${testInfo.title || '프레젠테이션'}</title>
      <style>
        body {
          font-family: 'Noto Sans KR', sans-serif;
          margin: 0;
          padding: 0;
        }
        .slide {
          width: 1024px;
          height: 768px;
          padding: 50px;
          box-sizing: border-box;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        h1 { font-size: 48px; text-align: center; }
        h2 { font-size: 36px; margin-bottom: 30px; }
        .question { margin-bottom: 30px; }
        .question-number { font-weight: bold; }
        .options { margin-left: 20px; }
        .passage { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .concept { color: #1a73e8; font-weight: bold; }
      </style>
    </head>
    <body>
      ${slides.join('\n')}
    </body>
    </html>
  `;
  
  // Create and download HTML file
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatOptions.fileName || 'presentation.html';
  a.click();
  URL.revokeObjectURL(url);
}

// Create question slide
function createQuestionSlide(questions, formatOptions) {
  let html = '<div class="slide">';
  
  questions.forEach((question, index) => {
    html += '<div class="question">';
    html += `<p><span class="question-number">${question.config?.questionNumber || index + 1}.</span> ${question.content}</p>`;
    
    if (question.subtype === 'multiple_choice' && question.options) {
      html += '<div class="options">';
      question.options.forEach((option, i) => {
        html += `<p>${i + 1}) ${option}</p>`;
      });
      html += '</div>';
    }
    
    html += '</div>';
  });
  
  html += '</div>';
  return html;
}

// Create content slide
function createContentSlide(block) {
  let html = '<div class="slide">';
  
  switch (block.type) {
    case 'passage':
      html += '<h2>지문</h2>';
      html += `<div class="passage">${block.content}</div>`;
      break;
      
    case 'concept':
      html += '<h2>핵심 개념</h2>';
      html += `<div class="concept">${block.content}</div>`;
      break;
      
    default:
      html += `<p>${block.content}</p>`;
  }
  
  html += '</div>';
  return html;
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

// Fallback text export when docx is not available
async function exportAsTextFile(blocks, formatOptions, testInfo = {}) {
  let content = '';
  
  // Header
  content += `${testInfo.title || '문서'}\n\n`;
  if (testInfo.subject || testInfo.grade) {
    content += [
      testInfo.subject && `과목: ${testInfo.subject}`,
      testInfo.grade && `학년: ${testInfo.grade}`,
      testInfo.date && `일시: ${testInfo.date}`
    ].filter(Boolean).join(' | ') + '\n\n';
  }
  
  content += `${testInfo.instructions || '※ 문제를 잘 읽고 답안을 작성하시오.'}\n\n`;
  content += '='.repeat(60) + '\n\n';
  
  // Blocks
  blocks.forEach((block, index) => {
    switch (block.type) {
      case 'question':
        content += `${index + 1}. ${block.content}\n`;
        if (formatOptions.showDifficulty !== 'none' && block.difficulty) {
          content += `   난이도: ${getDifficultyLabel(block.difficulty)}\n`;
        }
        if (block.subtype === 'multiple_choice' && block.options) {
          block.options.forEach((option, i) => {
            content += `   ${i + 1}) ${option}\n`;
          });
        }
        if (block.subtype === 'short_answer' || block.subtype === 'essay') {
          const lines = block.subtype === 'essay' ? 5 : 2;
          for (let i = 0; i < lines; i++) {
            content += '   ' + '_'.repeat(60) + '\n';
          }
        }
        if (formatOptions.showSources && block.material_title) {
          content += `   [출처: ${block.material_title}]\n`;
        }
        content += '\n';
        break;
        
      case 'passage':
        content += '[지문]\n';
        content += block.content + '\n\n';
        break;
        
      case 'concept':
        content += '[핵심 개념]\n';
        content += block.content + '\n\n';
        break;
        
      default:
        content += block.content + '\n\n';
    }
  });
  
  // Create and download text file
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = formatOptions.fileName?.replace('.docx', '.txt') || 'material.txt';
  a.click();
  URL.revokeObjectURL(url);
}