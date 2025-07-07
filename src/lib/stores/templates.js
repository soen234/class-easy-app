import { writable, derived } from 'svelte/store';

// Template definitions
const defaultTemplates = [
  {
    id: 'blank',
    name: '빈 캔버스',
    description: '자유롭게 편집할 수 있는 빈 캔버스',
    category: 'basic',
    difficulty: 'easy',
    estimatedTime: '자유',
    features: ['자유 편집', '텍스트 추가', '이미지 삽입', '도형 그리기'],
    tags: ['빈캔버스', '자유편집', '기본'],
    structure: [],
    elements: [],
    // 캔버스 초기 레이아웃
    canvasLayout: {
      objects: [] // 빈 캔버스
    }
  },
  {
    id: 'test',
    name: '시험지',
    description: '문제를 배치하여 시험지를 만들 수 있는 템플릿',
    category: 'exam',
    difficulty: 'medium',
    estimatedTime: '자동',
    features: ['문제은행 연동', '자동 포맷팅', '난이도 표시', '출처 표시'],
    tags: ['시험지', '문제은행', '자동생성'],
    structure: [
      { type: 'title', content: '시험지 제목', editable: true },
      { type: 'info', content: '과목: ___ | 학년: ___ | 시험 시간: ___ 분', editable: true },
      { type: 'instructions', content: '※ 문제를 잘 읽고 답안을 작성하시오.', editable: true },
      { type: 'questions', content: '', editable: true }
    ],
    elements: [
      { type: 'title', defaultContent: '시험지 제목', config: {} },
      { type: 'info', defaultContent: '과목: ___ | 학년: ___ | 시험 시간: ___ 분', config: {} },
      { type: 'instructions', defaultContent: '※ 문제를 잘 읽고 답안을 작성하시오.', config: {} },
      { type: 'questions', defaultContent: '', config: {} }
    ],
    // 캔버스 초기 레이아웃
    canvasLayout: {
      objects: [
        {
          type: 'text',
          content: '시험지 제목',
          x: 50,
          y: 30,
          width: 700,
          height: 50,
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center'
        },
        {
          type: 'text',
          content: '과목: ___ | 학년: ___ | 시험 시간: ___ 분',
          x: 50,
          y: 90,
          width: 700,
          height: 30,
          fontSize: 14,
          textAlign: 'center'
        },
        {
          type: 'text',
          content: '※ 문제를 잘 읽고 답안을 작성하시오.',
          x: 50,
          y: 130,
          width: 700,
          height: 30,
          fontSize: 12
        }
      ]
    }
  }
];

// Create stores
function createTemplateStore() {
  const { subscribe, set, update } = writable({
    templates: [...defaultTemplates],
    customTemplates: [],
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    // Get all templates (default + custom)
    getAllTemplates: () => {
      let state;
      subscribe(s => state = s)();
      return [...state.templates, ...state.customTemplates];
    },
    
    // Get template by ID
    getTemplateById: (id) => {
      let state;
      subscribe(s => state = s)();
      const allTemplates = [...state.templates, ...state.customTemplates];
      return allTemplates.find(t => t.id === id);
    },
    
    // Filter templates
    filterTemplates: (filters) => {
      let state;
      subscribe(s => state = s)();
      const allTemplates = [...state.templates, ...state.customTemplates];
      
      return allTemplates.filter(template => {
        const matchesCategory = !filters.category || filters.category === 'all' || template.category === filters.category;
        const matchesDifficulty = !filters.difficulty || filters.difficulty === 'all' || template.difficulty === filters.difficulty;
        const matchesSearch = !filters.search || 
          template.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          template.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          template.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()));
        
        return matchesCategory && matchesDifficulty && matchesSearch;
      });
    },
    
    // Add custom template
    addCustomTemplate: (template) => {
      update(state => ({
        ...state,
        customTemplates: [...state.customTemplates, {
          ...template,
          id: `custom-${Date.now()}`,
          isCustom: true
        }]
      }));
    },
    
    // Update custom template
    updateCustomTemplate: (id, updates) => {
      update(state => ({
        ...state,
        customTemplates: state.customTemplates.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
    },
    
    // Delete custom template
    deleteCustomTemplate: (id) => {
      update(state => ({
        ...state,
        customTemplates: state.customTemplates.filter(t => t.id !== id)
      }));
    },
    
    // Load custom templates from storage
    loadCustomTemplates: async () => {
      update(state => ({ ...state, loading: true }));
      try {
        // In the future, this would load from Supabase
        const stored = localStorage.getItem('customTemplates');
        const customTemplates = stored ? JSON.parse(stored) : [];
        update(state => ({ 
          ...state, 
          customTemplates,
          loading: false 
        }));
      } catch (error) {
        update(state => ({ 
          ...state, 
          error: error.message,
          loading: false 
        }));
      }
    },
    
    // Save custom templates to storage
    saveCustomTemplates: async () => {
      let state;
      subscribe(s => state = s)();
      try {
        // In the future, this would save to Supabase
        localStorage.setItem('customTemplates', JSON.stringify(state.customTemplates));
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
      }
    }
  };
}

// Create and export the store
export const templates = createTemplateStore();

// Derived store for template categories
export const templateCategories = derived(templates, $templates => {
  const allTemplates = [...$templates.templates, ...$templates.customTemplates];
  const categories = new Set(allTemplates.map(t => t.category));
  return Array.from(categories);
});

// Helper functions
export function getCategoryLabel(category) {
  const labels = {
    'basic': '기본',
    'exam': '시험지'
  };
  return labels[category] || category;
}

export function getDifficultyLabel(difficulty) {
  const labels = {
    'easy': '쉬움',
    'medium': '보통',
    'hard': '어려움'
  };
  return labels[difficulty] || difficulty;
}

export function getDifficultyColor(difficulty) {
  const colors = {
    'easy': 'badge-success',
    'medium': 'badge-warning',
    'hard': 'badge-error'
  };
  return colors[difficulty] || 'badge-ghost';
}

// Initialize custom templates on load
if (typeof window !== 'undefined') {
  templates.loadCustomTemplates();
}