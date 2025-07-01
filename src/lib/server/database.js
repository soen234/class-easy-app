import { createClient } from '@supabase/supabase-js'
import { env } from '$env/dynamic/public'

/**
 * 서버 사이드에서 사용자 인증 컨텍스트와 함께 Supabase 클라이언트 생성
 */
export function createAuthClient(accessToken) {
  const PUBLIC_SUPABASE_URL = env.PUBLIC_SUPABASE_URL
  const PUBLIC_SUPABASE_ANON_KEY = env.PUBLIC_SUPABASE_ANON_KEY
  
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다.')
  }
  
  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
  
  return supabase
}