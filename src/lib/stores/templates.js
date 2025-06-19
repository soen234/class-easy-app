import { writable, derived } from 'svelte/store';

// Template definitions
const defaultTemplates = [
  {
    id: 'exam-basic',
    name: '기본 시험지',
    description: '가장 일반적인 형태의 시험지 템플릿',
    category: 'exam',
    difficulty: 'easy',
    estimatedTime: '10분',
    features: ['헤더 정보', '문제 영역', '답안 영역', '채점표'],
    tags: ['시험', '기본', '객관식', '주관식'],
    structure: [
      { type: 'title', content: '시험지 제목', editable: true },
      { type: 'info', content: '과목: ___ | 학년: ___ | 시험 시간: ___ 분', editable: true },
      { type: 'instructions', content: '※ 문제를 잘 읽고 답안을 작성하시오.', editable: true },
      { type: 'questions', content: '', editable: true }
    ]
  },
  {
    id: 'exam-advanced',
    name: '고급 시험지',
    description: '복잡한 구조의 시험지를 위한 템플릿',
    category: 'exam',
    difficulty: 'hard',
    estimatedTime: '20분',
    features: ['다단계 섹션', '복합 문제', '부분 점수', '상세 채점'],
    tags: ['시험', '고급', '복합문제', '서술형'],
    structure: [
      { type: 'title', content: '시험지 제목', editable: true },
      { type: 'info', content: '과목: ___ | 학년: ___ | 시험 시간: ___ 분 | 총점: ___ 점', editable: true },
      { type: 'section', content: '제1부: 객관식 (각 5점)', editable: true },
      { type: 'questions', content: '', editable: true },
      { type: 'section', content: '제2부: 서술형 (각 10점)', editable: true },
      { type: 'questions', content: '', editable: true },
      { type: 'pagebreak', content: '', editable: false }
    ]
  },
  {
    id: 'worksheet-practice',
    name: '연습 학습지',
    description: '학생 연습용 학습지 템플릿',
    category: 'worksheet',
    difficulty: 'easy',
    estimatedTime: '15분',
    features: ['개념 설명', '예제', '연습 문제', '정답 및 해설'],
    tags: ['학습지', '연습', '개념', '예제'],
    structure: [
      { type: 'title', content: '학습 주제', editable: true },
      { type: 'subtitle', content: '학습 목표', editable: true },
      { type: 'text', content: '오늘 배울 내용: ___', editable: true },
      { type: 'section', content: '1. 개념 설명', editable: true },
      { type: 'text', content: '', editable: true },
      { type: 'section', content: '2. 예제', editable: true },
      { type: 'questions', content: '', editable: true },
      { type: 'section', content: '3. 연습 문제', editable: true },
      { type: 'questions', content: '', editable: true }
    ]
  },
  {
    id: 'quiz-quick',
    name: '빠른 퀴즈',
    description: '간단한 퀴즈나 확인 문제용 템플릿',
    category: 'quiz',
    difficulty: 'easy',
    estimatedTime: '5분',
    features: ['간결한 구성', '즉석 채점', '시각적 피드백'],
    tags: ['퀴즈', '간단', '확인', '피드백'],
    structure: [
      { type: 'title', content: '퀴즈', editable: true },
      { type: 'info', content: '이름: ___ | 날짜: ___', editable: true },
      { type: 'questions', content: '', editable: true },
      { type: 'scoring', content: '점수: ___ / ___', editable: true }
    ]
  },
  {
    id: 'homework-weekly',
    name: '주간 과제',
    description: '일주일 단위의 과제 템플릿',
    category: 'homework',
    difficulty: 'medium',
    estimatedTime: '25분',
    features: ['주차별 구분', '진도 체크', '자기평가', '교사 피드백'],
    tags: ['과제', '주간', '진도', '평가'],
    structure: [
      { type: 'title', content: '주간 과제', editable: true },
      { type: 'info', content: '주차: ___ | 기간: ___ ~ ___', editable: true },
      { type: 'section', content: '학습 목표', editable: true },
      { type: 'text', content: '', editable: true },
      { type: 'section', content: '과제 내용', editable: true },
      { type: 'questions', content: '', editable: true },
      { type: 'section', content: '자기 평가', editable: true },
      { type: 'checklist', content: '', editable: true }
    ]
  },
  {
    id: 'assessment-rubric',
    name: '평가 루브릭',
    description: '체계적인 평가를 위한 루브릭 템플릿',
    category: 'assessment',
    difficulty: 'medium',
    estimatedTime: '30분',
    features: ['평가 기준', '점수 배분', '상세 피드백', '개선 사항'],
    tags: ['평가', '루브릭', '기준', '피드백'],
    structure: [
      { type: 'title', content: '평가 루브릭', editable: true },
      { type: 'info', content: '평가 항목: ___ | 평가일: ___', editable: true },
      { type: 'table', content: 'rubric', editable: true },
      { type: 'section', content: '종합 평가', editable: true },
      { type: 'text', content: '', editable: true }
    ]
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
    'exam': '시험지',
    'worksheet': '학습지',
    'quiz': '퀴즈',
    'homework': '과제',
    'assessment': '평가'
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