import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase.js';

// 사용자 상태 저장
export const user = writable(null);
export const loading = writable(true);

// 인증 상태 초기화
export async function initAuth() {
  try {
    loading.set(true);
    
    // Supabase가 초기화되지 않았으면 스킵
    if (!supabase) {
      console.warn('Supabase가 초기화되지 않았습니다.');
      user.set(null);
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// 회원가입
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) {
    user.set(null);
  }
  return { error };
}

// Google 로그인
export async function signInWithGoogle() {
  // Check if we're in the browser before using window
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : undefined;
    
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  return { data, error };
}

// GitHub 로그인
export async function signInWithGitHub() {
  // Check if we're in the browser before using window
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/callback`
    : undefined;
    
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: redirectUrl
    }
  });
  return { data, error };
}