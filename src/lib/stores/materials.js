import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 재료 데이터 저장
export const materials = writable([]);
export const loading = writable(false);

// 더미 데이터 (Supabase 미설정 시 사용)
const dummyMaterials = [
  {
    id: '1',
    title: '블랙라벨 수학(하)',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1024000,
    pages: 120,
    created_at: '2024-01-15T09:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '2',
    title: '고등 수학 워크북',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 800000,
    pages: 80,
    created_at: '2024-01-10T09:00:00Z',
    user_id: 'demo-user'
  },
  {
    id: '3',
    title: '중간고사 시험지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 200000,
    pages: 4,
    created_at: '2024-01-20T09:00:00Z',
    user_id: 'demo-user'
  }
];

// 재료 목록 조회
export async function fetchMaterials(userId, type = null) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터 사용
      let filtered = dummyMaterials;
      if (type) {
        filtered = dummyMaterials.filter(m => m.type === type);
      }
      materials.set(filtered);
      return { data: filtered, error: null };
    }
    
    // 실제 Supabase 조회
    let query = supabase
      .from('materials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (type) {
      query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Materials fetch error:', error);
      return { data: null, error };
    }
    
    materials.set(data || []);
    return { data, error: null };
    
  } catch (error) {
    console.error('Materials fetch error:', error);
    return { data: null, error };
  } finally {
    loading.set(false);
  }
}

// 재료 추가
export async function addMaterial(userId, materialData) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터에 추가
      const newMaterial = {
        id: String(Date.now()),
        user_id: userId,
        created_at: new Date().toISOString(),
        ...materialData
      };
      
      const currentMaterials = [...dummyMaterials, newMaterial];
      dummyMaterials.push(newMaterial);
      materials.set(currentMaterials);
      
      return { data: newMaterial, error: null };
    }
    
    // 실제 Supabase 추가
    const { data, error } = await supabase
      .from('materials')
      .insert({
        user_id: userId,
        ...materialData
      })
      .select()
      .single();
    
    if (error) {
      console.error('Material add error:', error);
      return { data: null, error };
    }
    
    // 스토어 업데이트
    materials.update(items => [data, ...items]);
    return { data, error: null };
    
  } catch (error) {
    console.error('Material add error:', error);
    return { data: null, error };
  } finally {
    loading.set(false);
  }
}

// 재료 삭제
export async function deleteMaterial(materialId) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터에서 삭제
      const index = dummyMaterials.findIndex(m => m.id === materialId);
      if (index > -1) {
        dummyMaterials.splice(index, 1);
      }
      materials.update(items => items.filter(item => item.id !== materialId));
      return { error: null };
    }
    
    // 실제 Supabase 삭제
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);
    
    if (error) {
      console.error('Material delete error:', error);
      return { error };
    }
    
    // 스토어 업데이트
    materials.update(items => items.filter(item => item.id !== materialId));
    return { error: null };
    
  } catch (error) {
    console.error('Material delete error:', error);
    return { error };
  } finally {
    loading.set(false);
  }
}

// 파일 크기 포맷
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 파일 타입 아이콘
export function getFileTypeIcon(type) {
  if (type?.includes('pdf')) return '📄';
  if (type?.includes('word')) return '📝';
  if (type?.includes('powerpoint') || type?.includes('presentation')) return '📊';
  if (type?.includes('image')) return '🖼️';
  return '📎';
}