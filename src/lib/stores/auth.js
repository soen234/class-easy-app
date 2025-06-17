import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 사용자 상태 저장
export const user = writable(null);
export const loading = writable(true);

// 인증 상태 초기화
export async function initAuth() {
  try {
    loading.set(true);
    
    if (!supabase) {
      // Supabase가 설정되지 않은 경우 더미 사용자로 설정
      user.set({
        id: 'demo-user',
        email: 'demo@example.com',
        user_metadata: { name: '데모 사용자' }
      });
      loading.set(false);
      return;
    }
    
    // 현재 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    user.set(session?.user ?? null);
    
    // 인증 상태 변경 리스너
    supabase.auth.onAuthStateChange((event, session) => {
      user.set(session?.user ?? null);
      loading.set(false);
    });
  } catch (error) {
    console.error('Auth initialization error:', error);
    user.set(null);
  } finally {
    loading.set(false);
  }
}

// 로그인
export async function signIn(email, password) {
  if (!supabase) {
    // 개발 중에는 더미 로그인
    user.set({
      id: 'demo-user',
      email: email,
      user_metadata: { name: '데모 사용자' }
    });
    return { data: { user: { email } }, error: null };
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// 회원가입
export async function signUp(email, password) {
  if (!supabase) {
    // 개발 중에는 더미 회원가입
    return { data: { user: { email } }, error: null };
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

// 로그아웃
export async function signOut() {
  if (!supabase) {
    user.set(null);
    return { error: null };
  }
  
  const { error } = await supabase.auth.signOut();
  if (!error) {
    user.set(null);
  }
  return { error };
}

// Google 로그인
export async function signInWithGoogle() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase가 설정되지 않았습니다.' } };
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
}

// GitHub 로그인
export async function signInWithGitHub() {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase가 설정되지 않았습니다.' } };
  }
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  return { data, error };
}