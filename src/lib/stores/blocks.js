import { writable, get } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 블록/문항 데이터 저장
export const blocks = writable([]);
export const loading = writable(false);

// 더미 데이터 제거 (더 이상 사용하지 않음)
const dummyBlocks = [
  {
    id: '1',
    material_id: '1',
    type: 'question',
    subtype: 'multiple_choice',
    content: '다음 중 이차함수의 그래프가 아래로 볼록한 조건은?',
    options: ['a > 0', 'a < 0', 'a = 0', '상관없음'],
    correct_answer: 'a > 0',
    difficulty: 'medium',
    tags: ['이차함수', '그래프'],
    custom_tags: ['중요', '시험출제'],
    page_number: 15,
    score: 5,
    chapter: '3단원. 이차함수',
    linked_blocks: [],
    image_data: null,
    created_at: '2024-01-15T10:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '2',
    material_id: '1',
    type: 'question',
    subtype: 'short_answer',
    content: 'f(x) = x² - 4x + 3의 최솟값을 구하시오.',
    correct_answer: '-1',
    difficulty: 'medium',
    tags: ['이차함수', '최솟값'],
    custom_tags: ['연습문제'],
    page_number: 22,
    created_at: '2024-01-15T10:15:00Z',
    user_id: 'demo-user'
  },
  {
    id: '3',
    material_id: '2',
    type: 'passage',
    content: '미분가능한 함수는 항상 연속이지만, 연속인 함수가 항상 미분가능한 것은 아니다. 예를 들어, 절댓값 함수 |x|는 x=0에서 연속이지만 미분가능하지 않다.',
    difficulty: 'medium',
    tags: ['미분', '연속성'],
    custom_tags: ['개념설명', '핵심'],
    page_number: 45,
    created_at: '2024-01-10T11:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '4',
    material_id: '3',
    type: 'concept',
    content: '소수(Prime Number): 1과 자기 자신만을 약수로 가지는 1보다 큰 자연수',
    difficulty: 'easy',
    tags: ['수론', '소수'],
    custom_tags: ['정의', '기초개념'],
    page_number: 1,
    created_at: '2024-01-20T09:30:00Z',
    user_id: 'demo-user'
  },
  {
    id: '5',
    material_id: '2',
    type: 'question',
    subtype: 'essay',
    content: '함수의 연속성과 미분가능성의 관계에 대해 설명하시오.',
    difficulty: 'hard',
    tags: ['미분', '연속성'],
    custom_tags: ['서술형', '심화'],
    page_number: 48,
    created_at: '2024-01-10T11:30:00Z',
    user_id: 'demo-user'
  }
];

// 블록 목록 조회
export async function fetchBlocks(userId, materialId = null) {
  loading.set(true);
  
  try {
    
    // 실제 Supabase 조회 - materials 테이블과 join하여 자료명도 함께 가져옴
    let query = supabase
      .from('blocks')
      .select('*, materials(title)')
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
    
    // 자료명을 블록 데이터에 포함
    const blocksWithMaterialTitle = (data || []).map(block => ({
      ...block,
      material_title: block.materials?.title || '자료'
    }));
    
    blocks.set(blocksWithMaterialTitle);
    return { data: blocksWithMaterialTitle, error: null };
    
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
    // 삭제할 블록의 material_id 찾기
    const blockToDelete = get(blocks).find(b => b.id === blockId);
    const materialId = blockToDelete?.material_id;
    
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
    
    // 해당 자료의 블록 수 업데이트
    if (materialId) {
      await updateMaterialBlockCount(materialId);
    }
    
    return { error: null };
    
  } catch (error) {
    console.error('Block delete error:', error);
    return { error };
  } finally {
    loading.set(false);
  }
}

// 블록 일괄 삭제
export async function deleteBlocks(blockIds) {
  loading.set(true);
  
  try {
    // 삭제할 블록들의 material_id 찾기
    const blocksToDelete = get(blocks).filter(b => blockIds.includes(b.id));
    const materialIds = [...new Set(blocksToDelete.map(b => b.material_id).filter(Boolean))];
    
    // 실제 Supabase 일괄 삭제
    const { error } = await supabase
      .from('blocks')
      .delete()
      .in('id', blockIds);
    
    if (error) {
      console.error('Blocks delete error:', error);
      return { error };
    }
    
    // 스토어 업데이트
    blocks.update(items => items.filter(item => !blockIds.includes(item.id)));
    
    // 영향받은 자료들의 블록 수 업데이트
    for (const materialId of materialIds) {
      await updateMaterialBlockCount(materialId);
    }
    
    return { error: null };
    
  } catch (error) {
    console.error('Blocks delete error:', error);
    return { error };
  } finally {
    loading.set(false);
  }
}

// 자료의 블록 수 업데이트
async function updateMaterialBlockCount(materialId) {
  try {
    // 해당 자료의 남은 블록 수 조회
    const { count, error: countError } = await supabase
      .from('blocks')
      .select('*', { count: 'exact', head: true })
      .eq('material_id', materialId);
    
    if (countError) {
      console.error('Error counting blocks:', countError);
      return;
    }
    
    const blockCount = count || 0;
    
    // materials 테이블 업데이트
    const { error: updateError } = await supabase
      .from('materials')
      .update({
        extracted_count: blockCount,
        is_extracted: blockCount > 0
      })
      .eq('id', materialId);
    
    if (updateError) {
      console.error('Error updating material:', updateError);
    }
  } catch (error) {
    console.error('Error in updateMaterialBlockCount:', error);
  }
}

// 난이도 레벨 매핑
export function getDifficultyLabel(difficulty) {
  const levels = {
    'very_easy': '매우 쉬움',
    'easy': '쉬움',
    'medium': '보통',
    'hard': '어려움',
    'very_hard': '매우 어려움'
  };
  return levels[difficulty] || difficulty;
}

// 블록 타입 레벨 매핑
export function getBlockTypeLabel(type) {
  const types = {
    'question': '문항',
    'concept': '개념',
    'passage': '지문',
    'explanation': '해설'
  };
  return types[type] || type;
}

// 문항 서브타입 레벨 매핑
export function getQuestionSubtypeLabel(subtype) {
  const subtypes = {
    'multiple_choice': '객관식',
    'short_answer': '단답형',
    'essay': '서술형',
    'true_false': 'O/X'
  };
  return subtypes[subtype] || subtype;
}

// 난이도별 색상 클래스
export function getDifficultyBadgeClass(difficulty) {
  const classes = {
    'very_easy': 'badge-info',
    'easy': 'badge-success',
    'medium': 'badge-warning',
    'hard': 'badge-error',
    'very_hard': 'badge-secondary'
  };
  return classes[difficulty] || 'badge-ghost';
}

// 블록 타입별 아이콘
export function getBlockTypeIcon(type) {
  const icons = {
    'question': '❓',
    'concept': '💡',
    'passage': '📜',
    'explanation': '📝'
  };
  return icons[type] || '📄';
}

// 문항 서브타입별 아이콘
export function getQuestionSubtypeIcon(subtype) {
  const icons = {
    'multiple_choice': '📝',
    'short_answer': '✏️',
    'essay': '📄',
    'true_false': '✅'
  };
  return icons[subtype] || '❓';
}

// 블록 수정
export async function updateBlock(blockId, updates) {
  loading.set(true);
  
  try {
    
    // 실제 Supabase 수정
    const { error } = await supabase
      .from('blocks')
      .update(updates)
      .eq('id', blockId);
    
    if (error) {
      console.error('Block update error:', error);
      return { error };
    }
    
    // 스토어 업데이트
    blocks.update(items => items.map(item => 
      item.id === blockId ? { ...item, ...updates } : item
    ));
    return { error: null };
    
  } catch (error) {
    console.error('Block update error:', error);
    return { error };
  } finally {
    loading.set(false);
  }
}

// 모든 고유 커스텀 태그 가져오기
export function getAllCustomTags(blocksArray) {
  const tagsSet = new Set();
  blocksArray.forEach(block => {
    if (block.custom_tags && Array.isArray(block.custom_tags)) {
      block.custom_tags.forEach(tag => tagsSet.add(tag));
    }
  });
  return Array.from(tagsSet).sort();
}

// 모든 고유 단원 가져오기
export function getAllChapters(blocksArray) {
  const chaptersSet = new Set();
  blocksArray.forEach(block => {
    if (block.chapter && block.chapter.trim()) {
      chaptersSet.add(block.chapter);
    }
  });
  return Array.from(chaptersSet).sort();
}

// 컬렉션 관리
export const collection = writable([]);

// 컬렉션에 블록 추가
export function addToCollection(block) {
  collection.update(items => {
    // 중복 체크
    if (!items.find(item => item.id === block.id)) {
      return [...items, block];
    }
    return items;
  });
}

// 컬렉션에서 블록 제거
export function removeFromCollection(blockId) {
  collection.update(items => items.filter(item => item.id !== blockId));
}

// 컬렉션 비우기
export function clearCollection() {
  collection.set([]);
}

// 컬렉션에서 블록이 있는지 확인
export function isInCollection(blockId, collectionItems) {
  return collectionItems.some(item => item.id === blockId);
}

// 이미지 썸네일 생성 유틸리티
export function createThumbnail(imageData, maxWidth = 300, maxHeight = 300) {
  if (!imageData) return null;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // 고해상도 디스플레이를 위한 스케일 팩터
      const scaleFactor = window.devicePixelRatio || 1;
      
      // 비율 유지하며 리사이즈
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      
      // 캔버스 크기를 스케일 팩터에 맞게 설정
      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;
      
      // CSS 크기는 원래 크기로 설정
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // 컨텍스트 스케일링
      ctx.scale(scaleFactor, scaleFactor);
      
      // 고품질 렌더링 설정
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      ctx.drawImage(img, 0, 0, width, height);
      
      // 높은 품질로 이미지 데이터 URL 생성
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => resolve(null);
    img.src = imageData;
  });
}

// 연결된 블록(지문, 해설) 조회
export async function fetchLinkedBlocks(blockId) {
  if (!supabase) {
    // 더미 데이터 반환
    return { data: [], error: null };
  }
  
  try {
    const { data, error } = await supabase
      .from('linked_blocks')
      .select('*')
      .eq('parent_block_id', blockId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Linked blocks fetch error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Linked blocks fetch error:', error);
    return { data: null, error };
  }
}

// 연결된 블록 추가
export async function addLinkedBlock(userId, parentBlockId, linkedBlockData) {
  if (!supabase) {
    return { data: null, error: 'Supabase not initialized' };
  }
  
  try {
    const { data, error } = await supabase
      .from('linked_blocks')
      .insert({
        user_id: userId,
        parent_block_id: parentBlockId,
        ...linkedBlockData
      })
      .select()
      .single();
    
    if (error) {
      console.error('Linked block add error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Linked block add error:', error);
    return { data: null, error };
  }
}