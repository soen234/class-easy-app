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
    user_id: 'demo-user',
    folder_path: '/수학',
    subject: '수학',
    extracted_count: 15,
    is_extracted: true,
    extraction_date: '2024-01-16T10:30:00Z'
  },
  {
    id: '2',
    title: '고등 수학 워크북',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 800000,
    pages: 80,
    created_at: '2024-01-10T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/수학/연습문제',
    subject: '수학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '3',
    title: '중간고사 시험지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 200000,
    pages: 4,
    created_at: '2024-01-20T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/시험지',
    subject: '수학',
    extracted_count: 8,
    is_extracted: true,
    extraction_date: '2024-01-20T14:15:00Z'
  },
  {
    id: '4',
    title: '영어 단어장',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 512000,
    pages: 25,
    created_at: '2024-01-12T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/영어',
    subject: '영어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '5',
    title: '과학 실험 보고서',
    type: 'original',
    file_type: 'application/haansofthwp',
    file_size: 300000,
    pages: 12,
    created_at: '2024-01-08T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학',
    subject: '과학',
    extracted_count: 5,
    is_extracted: true,
    extraction_date: '2024-01-09T11:20:00Z'
  },
  {
    id: '6',
    title: '화학 발표자료',
    type: 'lesson',
    file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    file_size: 1500000,
    pages: 35,
    created_at: '2024-01-18T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학/화학',
    subject: '과학',
    extracted_count: 12,
    is_extracted: true,
    extraction_date: '2024-01-18T16:45:00Z'
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
  if (!type) return '📎';
  
  const lowerType = type.toLowerCase();
  
  // PDF 파일
  if (lowerType.includes('pdf')) return '📕';
  
  // Word 문서
  if (lowerType.includes('word') || lowerType.includes('document')) return '📘';
  
  // PowerPoint 프레젠테이션
  if (lowerType.includes('powerpoint') || lowerType.includes('presentation')) return '📗';
  
  // Excel 스프레드시트
  if (lowerType.includes('excel') || lowerType.includes('sheet')) return '📊';
  
  // HWP 문서
  if (lowerType.includes('hwp')) return '📄';
  
  // 이미지 파일
  if (lowerType.includes('image') || lowerType.includes('jpeg') || lowerType.includes('jpg') || lowerType.includes('png') || lowerType.includes('gif')) return '🖼️';
  
  // 텍스트 파일
  if (lowerType.includes('text') || lowerType.includes('txt')) return '📃';
  
  // 기본 파일
  return '📎';
}

// 파일 타입 색상
export function getFileTypeColor(type) {
  if (!type) return 'text-base-content';
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes('pdf')) return 'text-red-500';
  if (lowerType.includes('word') || lowerType.includes('document')) return 'text-blue-500';
  if (lowerType.includes('powerpoint') || lowerType.includes('presentation')) return 'text-orange-500';
  if (lowerType.includes('excel') || lowerType.includes('sheet')) return 'text-green-500';
  if (lowerType.includes('hwp')) return 'text-purple-500';
  if (lowerType.includes('image')) return 'text-pink-500';
  if (lowerType.includes('text') || lowerType.includes('txt')) return 'text-gray-500';
  
  return 'text-base-content';
}