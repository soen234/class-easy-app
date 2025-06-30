import { supabase } from '$lib/supabase.js';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
  // Supabase 세션 확인
  console.log('hooks.server.js - Processing:', event.url.pathname);
  
  try {
    // Authorization 헤더에서 토큰 확인
    const authHeader = event.request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('Verifying Bearer token...');
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (!error && user) {
          console.log('User authenticated via Bearer token:', user.id);
          event.locals.user = user;
        } else {
          console.error('Bearer token verification failed:', error);
        }
      } catch (tokenError) {
        console.error('Bearer token verification error:', tokenError);
      }
    }
    
    // Authorization 헤더가 없으면 세션 확인
    if (!event.locals.user) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        event.locals.user = session.user;
      } else {
        // 세션이 없으면 쿠키에서 토큰 확인
        const sbAccessToken = event.cookies.get('sb-lyjmljtnbodquvwkoizz-auth-token');
        
        if (sbAccessToken && sbAccessToken !== 'undefined') {
          try {
            // getUser를 사용하여 토큰 검증
            const { data: { user }, error } = await supabase.auth.getUser(sbAccessToken);
            
            if (!error && user) {
              event.locals.user = user;
            }
          } catch (tokenError) {
            console.error('Cookie token verification error:', tokenError);
          }
        }
      }
    }
  } catch (e) {
    console.error('Auth verification error:', e);
  }
  
  
  // 보호된 라우트 확인
  const protectedRoutes = ['/my-materials', '/extract', '/question-bank', '/canvas'];
  const isProtectedRoute = protectedRoutes.some(route => 
    event.url.pathname.startsWith(route)
  );
  
  if (isProtectedRoute && !event.locals.user) {
    // 로그인 페이지로 리다이렉트
    return new Response(null, {
      status: 302,
      headers: {
        location: `/auth?redirectTo=${encodeURIComponent(event.url.pathname)}`
      }
    });
  }
  
  // API 에러 핸들링 개선
  try {
    const response = await resolve(event);
    return response;
  } catch (error) {
    console.error('Server error:', error);
    
    // API 라우트 에러인 경우 더 자세한 정보 반환
    if (event.url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error.message,
          stack: error.stack
        }), 
        { 
          status: 500,
          headers: { 'content-type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

/** @type {import('@sveltejs/kit').HandleServerError} */
export function handleError({ error, event }) {
  console.error('Unhandled error:', error);
  console.error('Event:', event.url.pathname);
  
  return {
    message: 'Internal Server Error',
    details: error?.message || 'Unknown error'
  };
}