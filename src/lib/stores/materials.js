import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 재료 데이터 저장
export const materials = writable([]);
export const loading = writable(false);

// 더미 데이터 (Supabase 미설정 시 사용)
const dummyMaterials = [
  // 원본 자료 - 루트 폴더
  {
    id: '1',
    title: '블랙라벨 수학(하)',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1024000,
    pages: 120,
    created_at: '2024-01-15T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/',
    subject: '수학',
    extracted_count: 15,
    is_extracted: true,
    extraction_date: '2024-01-16T10:30:00Z'
  },
  {
    id: '31',
    title: '종합 문제집',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 950000,
    pages: 85,
    created_at: '2024-01-12T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/',
    subject: '수학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '32',
    title: '영어 종합 평가',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 420000,
    pages: 18,
    created_at: '2024-01-16T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/',
    subject: '영어',
    extracted_count: 12,
    is_extracted: true,
    extraction_date: '2024-01-17T14:20:00Z'
  },
  // 원본 자료 - 수학 폴더
  {
    id: '33',
    title: '수학의 정석 기본편',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1600000,
    pages: 180,
    created_at: '2024-01-08T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/수학',
    subject: '수학',
    extracted_count: 28,
    is_extracted: true,
    extraction_date: '2024-01-09T11:30:00Z'
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
    id: '11',
    title: '수학의 정석 미적분',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1800000,
    pages: 250,
    created_at: '2024-01-05T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/수학',
    subject: '수학',
    extracted_count: 35,
    is_extracted: true,
    extraction_date: '2024-01-06T11:20:00Z'
  },
  {
    id: '12',
    title: '기하 문제 모음집',
    type: 'original',
    file_type: 'image/jpeg',
    file_size: 2500000,
    pages: 45,
    created_at: '2024-01-22T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/수학/기하',
    subject: '수학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  // 원본 자료 - 영어
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
    id: '13',
    title: '영문법 총정리',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 720000,
    pages: 55,
    created_at: '2024-01-18T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/영어',
    subject: '영어',
    extracted_count: 22,
    is_extracted: true,
    extraction_date: '2024-01-19T15:30:00Z'
  },
  {
    id: '14',
    title: '토익 독해 문제집',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1300000,
    pages: 180,
    created_at: '2024-01-25T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/영어/토익',
    subject: '영어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '15',
    title: '리스닝 교재 스크립트',
    type: 'original',
    file_type: 'text/plain',
    file_size: 85000,
    pages: 12,
    created_at: '2024-01-28T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/영어/리스닝',
    subject: '영어',
    extracted_count: 8,
    is_extracted: true,
    extraction_date: '2024-01-29T10:15:00Z'
  },
  // 원본 자료 - 과학
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
    id: '16',
    title: '물리학 개념 정리',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 950000,
    pages: 95,
    created_at: '2024-01-20T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학/물리',
    subject: '과학',
    extracted_count: 18,
    is_extracted: true,
    extraction_date: '2024-01-21T14:20:00Z'
  },
  {
    id: '17',
    title: '화학 반응식 모음',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    file_size: 420000,
    pages: 8,
    created_at: '2024-01-30T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학/화학',
    subject: '과학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '18',
    title: '생물 도감',
    type: 'original',
    file_type: 'image/png',
    file_size: 3200000,
    pages: 75,
    created_at: '2024-02-02T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학/생물',
    subject: '과학',
    extracted_count: 12,
    is_extracted: true,
    extraction_date: '2024-02-03T16:45:00Z'
  },
  // 원본 자료 - 국어
  {
    id: '19',
    title: '고전 문학 작품집',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 1650000,
    pages: 200,
    created_at: '2024-01-14T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/국어',
    subject: '국어',
    extracted_count: 25,
    is_extracted: true,
    extraction_date: '2024-01-15T13:30:00Z'
  },
  {
    id: '20',
    title: '현대 소설 해석',
    type: 'original',
    file_type: 'application/haansofthwp',
    file_size: 580000,
    pages: 35,
    created_at: '2024-01-26T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/국어/현대문학',
    subject: '국어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '21',
    title: '언어와 매체 문제집',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 890000,
    pages: 85,
    created_at: '2024-02-01T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/국어',
    subject: '국어',
    extracted_count: 16,
    is_extracted: true,
    extraction_date: '2024-02-02T11:45:00Z'
  },
  // 원본 자료 - 사회
  {
    id: '22',
    title: '한국사 연표',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 345000,
    pages: 28,
    created_at: '2024-01-17T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/사회',
    subject: '사회',
    extracted_count: 20,
    is_extracted: true,
    extraction_date: '2024-01-18T10:20:00Z'
  },
  {
    id: '23',
    title: '세계 지리 자료',
    type: 'original',
    file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    file_size: 2100000,
    pages: 65,
    created_at: '2024-01-23T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/사회/지리',
    subject: '사회',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '24',
    title: '경제 원리 정리',
    type: 'original',
    file_type: 'application/pdf',
    file_size: 775000,
    pages: 60,
    created_at: '2024-01-31T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/사회/경제',
    subject: '사회',
    extracted_count: 14,
    is_extracted: true,
    extraction_date: '2024-02-01T14:30:00Z'
  },
  
  // 제작한 자료 - 루트 폴더
  {
    id: '3',
    title: '중간고사 시험지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 200000,
    pages: 4,
    created_at: '2024-01-20T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/',
    subject: '수학',
    extracted_count: 8,
    is_extracted: true,
    extraction_date: '2024-01-20T14:15:00Z'
  },
  {
    id: '34',
    title: '종합 평가지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 150000,
    pages: 3,
    created_at: '2024-02-06T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/',
    subject: '영어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  // 제작한 자료 - 시험지 폴더
  {
    id: '35',
    title: '기말고사 수학 시험지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 220000,
    pages: 5,
    created_at: '2024-01-28T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/시험지',
    subject: '수학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
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
  },
  {
    id: '25',
    title: '기말고사 문제지',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 180000,
    pages: 3,
    created_at: '2024-02-05T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/시험지',
    subject: '영어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '26',
    title: '수학 개념 정리 노트',
    type: 'lesson',
    file_type: 'application/haansofthwp',
    file_size: 420000,
    pages: 18,
    created_at: '2024-01-24T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/수학/정리노트',
    subject: '수학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '27',
    title: '영어 문법 연습지',
    type: 'lesson',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 230000,
    pages: 8,
    created_at: '2024-01-29T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/영어/연습지',
    subject: '영어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '28',
    title: '물리 실험 워크시트',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 310000,
    pages: 6,
    created_at: '2024-02-03T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/과학/물리',
    subject: '과학',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '29',
    title: '국어 독해 연습 문제',
    type: 'lesson',
    file_type: 'application/pdf',
    file_size: 275000,
    pages: 12,
    created_at: '2024-01-27T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/국어/독해',
    subject: '국어',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  },
  {
    id: '30',
    title: '사회 토론 자료',
    type: 'lesson',
    file_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    file_size: 890000,
    pages: 25,
    created_at: '2024-02-04T09:00:00Z',
    user_id: 'demo-user',
    folder_path: '/사회/토론',
    subject: '사회',
    extracted_count: 0,
    is_extracted: false,
    extraction_date: null
  }
];

// 재료 목록 조회
export async function fetchMaterials(userId, type = null) {
  loading.set(true);
  
  try {
    if (!supabase) {
      // 더미 데이터 사용 - 전체 데이터를 스토어에 저장
      materials.set(dummyMaterials);
      let filtered = dummyMaterials;
      if (type) {
        filtered = dummyMaterials.filter(m => m.type === type);
      }
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

// 새 자료 생성
export function createMaterial(materialData) {
  return new Promise((resolve, reject) => {
    try {
      const newMaterial = {
        id: Date.now().toString(),
        title: materialData.title,
        type: 'custom',
        subject: materialData.subject,
        grade: materialData.grade,
        folder_id: materialData.folder_id,
        folder_path: materialData.folder_id ? getFolderPath(materialData.folder_id) : '/',
        tags: materialData.tags || [],
        content: materialData.content,
        template_id: materialData.template_id,
        is_public: materialData.is_public || false,
        created_at: materialData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'demo-user',
        file_type: 'application/json',
        file_size: JSON.stringify(materialData.content).length,
        pages: 1
      };
      
      // Add to store
      materials.update(items => [...items, newMaterial]);
      dummyMaterials.push(newMaterial);
      
      // In real app, would save to Supabase
      // const { data, error } = await supabase
      //   .from('materials')
      //   .insert(newMaterial);
      
      resolve(newMaterial);
    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to get folder path
function getFolderPath(folderId) {
  const folders = getFolderStructure();
  const folder = folders.find(f => f.id === folderId);
  return folder ? folder.path : '/';
}

// Get folder structure
export function getFolderStructure() {
  let currentMaterials;
  materials.subscribe(value => currentMaterials = value)();
  
  const folders = [];
  currentMaterials.forEach(material => {
    if (material.folder_path && material.folder_path !== '/') {
      const parts = material.folder_path.split('/').filter(p => p);
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += '/' + part;
        if (!folders.find(f => f.path === currentPath)) {
          folders.push({
            id: `folder-${currentPath}`,
            name: part,
            path: currentPath,
            level: index
          });
        }
      });
    }
  });
  
  return folders;
}