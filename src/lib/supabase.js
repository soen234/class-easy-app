import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

// 임시로 더미 클라이언트 생성 (실제 Supabase 설정 전까지)
const isDevelopment = !PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL === 'your_supabase_project_url'

export const supabase = isDevelopment 
  ? null  // 개발 중에는 null
  : createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)

// 인증 관련 헬퍼 함수들
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 데이터베이스 헬퍼 함수들
export async function getMaterials(userId, type = null) {
  let query = supabase
    .from('materials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (type) {
    query = query.eq('type', type)
  }
  
  const { data, error } = await query
  return { data, error }
}

export async function uploadMaterial(file, userId, metadata = {}) {
  // 파일을 Storage에 업로드
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}.${fileExt}`
  const filePath = `${userId}/materials/${fileName}`
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('materials')
    .upload(filePath, file)
  
  if (uploadError) {
    return { data: null, error: uploadError }
  }
  
  // 데이터베이스에 메타데이터 저장
  const { data, error } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      title: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: file.type,
      type: metadata.type || 'original',
      ...metadata
    })
    .select()
    .single()
  
  return { data, error }
}

export async function getBlocks(userId, materialId = null) {
  let query = supabase
    .from('blocks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (materialId) {
    query = query.eq('material_id', materialId)
  }
  
  const { data, error } = await query
  return { data, error }
}