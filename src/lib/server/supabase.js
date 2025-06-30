import { createClient } from '@supabase/supabase-js'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

// 서버 사이드용 Supabase 클라이언트
export function createServerClient() {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase env vars:', { 
      url: PUBLIC_SUPABASE_URL, 
      key: PUBLIC_SUPABASE_ANON_KEY ? 'exists' : 'missing' 
    });
    throw new Error('Supabase 서버 환경 변수가 설정되지 않았습니다.')
  }
  
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}