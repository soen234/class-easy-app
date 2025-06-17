# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에 가입 및 로그인
2. "New Project" 클릭
3. 조직 선택 (또는 새로 생성)
4. 프로젝트 이름: `class-easy`
5. 데이터베이스 비밀번호 설정
6. 지역 선택 (Asia - Seoul 권장)
7. "Create new project" 클릭

## 2. 환경변수 설정

프로젝트 생성 후 Settings > API에서 다음 정보를 복사:

```env
PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

`.env` 파일에 실제 값으로 교체하세요.

## 3. 데이터베이스 스키마 생성

1. Supabase 대시보드에서 SQL Editor로 이동
2. `supabase/schema.sql` 파일의 내용을 복사
3. SQL Editor에서 실행 (Run)

## 4. Storage 버킷 생성

Storage 섹션에서 다음 버킷들을 생성:

1. **materials** (Public: false)
   - 업로드된 원본 파일 저장용
   
2. **generated** (Public: false)
   - 생성된 문서 저장용
   
3. **thumbnails** (Public: true)
   - 파일 썸네일 저장용

## 5. Authentication 설정

Authentication > Settings에서:

1. **Site URL**: `http://localhost:5174` (개발용)
2. **Redirect URLs**: 
   - `http://localhost:5174/auth/callback`
   - 배포 시 실제 도메인으로 업데이트

### Google OAuth 설정 (선택사항)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. APIs & Services > OAuth consent screen 설정
4. APIs & Services > Credentials에서 OAuth 2.0 Client ID 생성
5. Authorized redirect URIs에 추가:
   - `https://your-project-id.supabase.co/auth/v1/callback`
6. Client ID와 Secret을 Supabase에 설정

### GitHub OAuth 설정 (선택사항)

1. GitHub Settings > Developer settings > OAuth Apps
2. "New OAuth App" 클릭
3. 설정:
   - Application name: `Class Easy`
   - Homepage URL: `http://localhost:5174`
   - Authorization callback URL: `https://your-project-id.supabase.co/auth/v1/callback`
4. Client ID와 Secret을 Supabase에 설정

## 6. Row Level Security 정책 확인

schema.sql을 실행하면 RLS 정책이 자동으로 생성되지만, 
Authentication > Policies에서 정책들이 제대로 적용되었는지 확인하세요.

## 7. 테스트

1. 개발 서버 실행: `npm run dev`
2. `/auth` 페이지에서 회원가입/로그인 테스트
3. 로그인 후 사이드바에 사용자 정보가 표시되는지 확인

## 문제 해결

### CORS 에러
- Site URL과 Redirect URLs가 올바르게 설정되었는지 확인

### RLS 정책 에러
- 테이블의 RLS가 활성화되었는지 확인
- 정책이 올바르게 생성되었는지 확인

### OAuth 에러
- OAuth 앱의 콜백 URL이 정확한지 확인
- Supabase에서 OAuth 설정이 활성화되었는지 확인