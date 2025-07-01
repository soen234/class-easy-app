import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/public'

// 환경 변수
const SUPABASE_URL = env.PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY

// Supabase 클라이언트 생성 (환경 변수가 있을 때만)
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null

// 런타임에서만 에러 체크
export function checkSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.')
  }
  return true
}

if (supabase) {
  console.log('Supabase connected to:', SUPABASE_URL)
}

export async function signUp(email, password, metadata = {}) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 초기화되지 않았습니다.') }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  })
  return { data, error }
}

export async function signIn(email, password) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 초기화되지 않았습니다.') }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  if (!supabase) {
    return { error: new Error('Supabase가 초기화되지 않았습니다.') }
  }
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function signInWithGoogle() {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 초기화되지 않았습니다.') }
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

export async function getCurrentUser() {
  if (!supabase) {
    return null
  }
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 파일 업로드 헬퍼
export async function uploadFile(bucket, path, file) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 초기화되지 않았습니다.') }
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  return { data, error };
}

// 파일 URL 가져오기
export function getPublicUrl(bucket, path) {
  if (!supabase) {
    return { data: { publicUrl: '' } }
  }
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

// 실시간 구독 헬퍼
export function subscribe(channel, callback) {
  return supabase
    .channel(channel)
    .on('postgres_changes', { event: '*', schema: 'public' }, callback)
    .subscribe();
}