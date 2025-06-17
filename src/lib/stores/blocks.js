import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 블록/문항 데이터 저장
export const blocks = writable([]);
export const loading = writable(false);

// 더미 데이터 (Supabase 미설정 시 사용)
const dummyBlocks = [
  {
    id: '1',
    material_id: '1',
    type: 'multiple_choice',
    question: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?',
    options: ['a > 0', 'a < 0', 'a = 0', '상관없음'],
    correct_answer: 'a > 0',
    difficulty: 'medium',
    tags: ['이차함수', '그래프'],
    page_number: 15,
    created_at: '2024-01-15T10:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '2',
    material_id: '1',
    type: 'short_answer',
    question: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.',
    correct_answer: '-1',
    difficulty: 'medium',
    tags: ['이차함수', '최솟값'],
    page_number: 22,
    created_at: '2024-01-15T10:15:00Z',
    user_id: 'demo-user'
  },
  {
    id: '3',
    material_id: '2',
    type: 'essay',
    question: '함수의 연속성과 미분가능성의 관계에 대해 설명하시오.',
    difficulty: 'hard',
    tags: ['미분', '연속성'],
    page_number: 45,
    created_at: '2024-01-10T11:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '4',
    material_id: '3',
    type: 'multiple_choice',
    question: '다음 중 소수가 아닌 것은?',
    options: ['2', '3', '4', '5'],
    correct_answer: '4',
    difficulty: 'easy',
    tags: ['수론', '소수'],
    page_number: 1,
    created_at: '2024-01-20T09:30:00Z',
    user_id: 'demo-user'
  }
];

// 블록 목록 조회
export async function fetchBlocks(userId, materialId = null) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터 사용
      let filtered = dummyBlocks;
      if (materialId) {
        filtered = dummyBlocks.filter(b => b.material_id === materialId);
      }
      blocks.set(filtered);
      return { data: filtered, error: null };
    }
    
    // 실제 Supabase 조회
    let query = supabase
      .from('blocks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (materialId) {
      query = query.eq('material_id', materialId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Blocks fetch error:', error);
      return { data: null, error };
    }
    
    blocks.set(data || []);
    return { data, error: null };
    
  } catch (error) {
    console.error('Blocks fetch error:', error);
    return { data: null, error };
  } finally {
    loading.set(false);
  }
}

// 블록 추가
export async function addBlock(userId, blockData) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터에 추가
      const newBlock = {
        id: String(Date.now()),
        user_id: userId,
        created_at: new Date().toISOString(),
        ...blockData
      };
      
      dummyBlocks.push(newBlock);
      blocks.update(items => [newBlock, ...items]);
      
      return { data: newBlock, error: null };
    }
    
    // 실제 Supabase 추가
    const { data, error } = await supabase
      .from('blocks')
      .insert({
        user_id: userId,
        ...blockData
      })
      .select()
      .single();
    
    if (error) {
      console.error('Block add error:', error);
      return { data: null, error };
    }
    
    // 스토어 업데이트
    blocks.update(items => [data, ...items]);
    return { data, error: null };
    
  } catch (error) {
    console.error('Block add error:', error);
    return { data: null, error };
  } finally {
    loading.set(false);
  }
}

// 블록 삭제
export async function deleteBlock(blockId) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터에서 삭제
      const index = dummyBlocks.findIndex(b => b.id === blockId);
      if (index > -1) {
        dummyBlocks.splice(index, 1);
      }
      blocks.update(items => items.filter(item => item.id !== blockId));
      return { error: null };
    }
    
    // 실제 Supabase 삭제
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', blockId);
    
    if (error) {
      console.error('Block delete error:', error);
      return { error };
    }
    
    // 스토어 업데이트
    blocks.update(items => items.filter(item => item.id !== blockId));
    return { error: null };
    
  } catch (error) {
    console.error('Block delete error:', error);
    return { error };
  } finally {
    loading.set(false);
  }
}

// 난이도 레벨 매핑
export function getDifficultyLabel(difficulty) {
  const levels = {
    'easy': '쉬움',
    'medium': '보통',
    'hard': '어려움'
  };
  return levels[difficulty] || difficulty;
}

// 문항 타입 레벨 매핑
export function getQuestionTypeLabel(type) {
  const types = {
    'multiple_choice': '객관식',
    'short_answer': '단답형',
    'essay': '서술형',
    'true_false': 'O/X'
  };
  return types[type] || type;
}

// 난이도별 색상 클래스
export function getDifficultyBadgeClass(difficulty) {
  const classes = {
    'easy': 'badge-success',
    'medium': 'badge-warning',
    'hard': 'badge-error'
  };
  return classes[difficulty] || 'badge-ghost';
}

// 문항 타입별 아이콘
export function getQuestionTypeIcon(type) {
  const icons = {
    'multiple_choice': '📝',
    'short_answer': '✏️',
    'essay': '📄',
    'true_false': '✅'
  };
  return icons[type] || '❓';
}