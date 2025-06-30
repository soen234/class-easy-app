# Class Easy 설정 가이드

## Supabase 설정

### 1. Supabase 프로젝트 설정
현재 프로젝트는 이미 Supabase 프로젝트가 설정되어 있습니다:
- Project URL: https://lyjmljtnbodquvwkoizz.supabase.co
- 환경 변수는 `.env` 파일에 설정되어 있습니다.

### 2. 데이터베이스 테이블 생성
Supabase 대시보드의 SQL Editor에서 다음 파일들을 순서대로 실행하세요:

1. `supabase/migrations/001_initial_schema.sql` - 기본 테이블 및 RLS 정책 생성
2. `supabase/migrations/002_storage_setup.sql` - Storage 버킷 및 정책 설정

### 3. Storage 설정
Supabase 대시보드에서:
1. Storage 섹션으로 이동
2. `materials-original` 버킷이 생성되었는지 확인
3. 버킷이 private으로 설정되어 있는지 확인

### 4. Authentication 설정
1. Authentication > Providers에서 다음 설정:
   - Email/Password 인증 활성화
   - Google OAuth 설정 (선택사항)
   - GitHub OAuth 설정 (선택사항)

2. Authentication > URL Configuration에서:
   - Site URL: `http://localhost:5173` (개발) 또는 실제 도메인
   - Redirect URLs에 추가:
     - `http://localhost:5173/auth/callback`
     - `https://your-domain.com/auth/callback` (프로덕션)

## 로컬 개발 환경 설정

### 1. 환경 변수 설정
`.env` 파일이 이미 설정되어 있습니다. 필요시 `.env.example`을 참고하세요.

### 2. 의존성 설치
```bash
npm install
```

### 3. 개발 서버 실행
```bash
npm run dev
```

## 기능 테스트

### 1. 회원가입/로그인
- `/login` 페이지에서 회원가입 및 로그인 테스트
- Google OAuth 로그인 테스트

### 2. 파일 업로드
- "내 자료" 페이지에서 파일 업로드
- PDF, 이미지, Word 문서 지원

### 3. 문항 추출
- 업로드된 자료에서 문항 추출
- 추출된 문항은 "문제 은행"에 저장

## 문제 해결

### 1. Supabase 연결 오류
- 환경 변수가 올바르게 설정되었는지 확인
- Supabase 프로젝트가 활성화되어 있는지 확인

### 2. 파일 업로드 실패
- Storage 버킷이 생성되었는지 확인
- RLS 정책이 올바르게 설정되었는지 확인
- 파일 크기가 100MB 이하인지 확인

### 3. 로그인 문제
- Authentication 설정이 올바른지 확인
- Redirect URL이 올바르게 설정되었는지 확인

## 개발 모드 vs 프로덕션 모드

현재 코드는 환경 변수 설정 여부에 따라 자동으로 모드를 전환합니다:
- 환경 변수가 없으면: 개발 모드 (localStorage/IndexedDB 사용)
- 환경 변수가 있으면: 프로덕션 모드 (Supabase 사용)

## 데이터 마이그레이션

기존 로컬 데이터를 Supabase로 마이그레이션하려면:
1. 로그인 후 앱을 사용하면 자동으로 마이그레이션 시도
2. 수동 마이그레이션이 필요한 경우 개발자 콘솔에서 확인

## 보안 고려사항

1. RLS (Row Level Security)가 모든 테이블에 활성화되어 있음
2. 사용자는 자신의 데이터만 접근 가능
3. Storage 파일도 소유자만 접근 가능
4. API 키는 클라이언트에 노출되지 않도록 주의