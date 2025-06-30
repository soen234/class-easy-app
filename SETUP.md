# Class Easy 설정 가이드

## 1. Supabase 프로젝트 설정

### 1.1 Supabase 계정 생성
1. [https://supabase.com](https://supabase.com) 접속
2. GitHub 또는 이메일로 회원가입
3. 새 프로젝트 생성

### 1.2 프로젝트 설정
```
프로젝트 이름: class-easy
데이터베이스 비밀번호: [강력한 비밀번호 설정]
지역: Northeast Asia (Seoul)
```

### 1.3 환경 변수 설정
1. Supabase 대시보드에서 Settings > API 이동
2. 다음 값들을 복사:
   - Project URL
   - Anon public key

3. 프로젝트 루트에 `.env` 파일 생성:
```env
PUBLIC_SUPABASE_URL=your_project_url
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 2. 데이터베이스 설정

### 2.1 SQL 마이그레이션 실행
Supabase 대시보드에서 SQL Editor로 이동하여 다음 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_storage_setup.sql`

### 2.2 Storage 버킷 생성
Supabase 대시보드에서 Storage로 이동하여 다음 버킷 생성:

1. **materials-original**
   - Public: No
   - File size limit: 50MB
   - Allowed MIME types: `application/pdf`, `image/*`

2. **materials-processed**
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: `image/*`

3. **projects-exports**
   - Public: No
   - File size limit: 100MB
   - Allowed MIME types: `application/pdf`, `image/*`, `application/zip`

4. **user-avatars**
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/*`

5. **templates-preview**
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/*`

## 3. 인증 설정

### 3.1 이메일 인증 설정
1. Authentication > Providers > Email 활성화
2. 다음 설정 확인:
   - Enable Email Signup: ON
   - Enable Email Confirmations: ON
   - Double Confirm Email Changes: ON

### 3.2 Google OAuth 설정 (선택사항)
1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. OAuth 2.0 클라이언트 ID 생성
4. 승인된 리디렉션 URI 추가:
   ```
   https://your-project-id.supabase.co/auth/v1/callback
   ```
5. Supabase에서 Google Provider 활성화 및 Client ID/Secret 입력

## 4. 로컬 개발 환경

### 4.1 의존성 설치
```bash
npm install
```

### 4.2 개발 서버 실행
```bash
npm run dev
```

### 4.3 테스트 계정
개발 모드에서는 다음 테스트 계정 사용 가능:
- 이메일: demo@example.com
- 비밀번호: (아무 비밀번호)

## 5. 프로덕션 배포

### 5.1 Vercel 배포
1. GitHub 리포지토리에 코드 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경 변수 설정:
   ```
   PUBLIC_SUPABASE_URL=your_project_url
   PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```
4. 배포

### 5.2 Edge Functions 배포 (AI 처리용)
```bash
supabase functions deploy process-material
```

## 6. 추가 설정

### 6.1 AI OCR 서비스 (선택사항)
Google Cloud Vision API 사용 시:
1. Google Cloud Console에서 Vision API 활성화
2. 서비스 계정 생성 및 키 다운로드
3. Edge Function 환경 변수 설정

### 6.2 모니터링
1. Supabase 대시보드에서 Logs 확인
2. Vercel Analytics 설정 (선택사항)

## 7. 문제 해결

### 일반적인 문제들

**Q: 로그인이 안 돼요**
A: 
- `.env` 파일의 환경 변수 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 브라우저 콘솔에서 에러 메시지 확인

**Q: 파일 업로드가 실패해요**
A: 
- Storage 버킷이 생성되어 있는지 확인
- RLS 정책이 올바르게 설정되어 있는지 확인
- 파일 크기가 제한을 초과하지 않는지 확인

**Q: 자동 저장이 작동하지 않아요**
A: 
- 네트워크 연결 확인
- 브라우저 개발자 도구에서 API 호출 확인
- 로컬 스토리지에 임시 저장되는지 확인

## 8. 개발 팁

1. **로컬 Supabase 사용** (선택사항)
   ```bash
   supabase init
   supabase start
   ```

2. **타입 생성**
   ```bash
   supabase gen types typescript --local > src/lib/types/supabase.ts
   ```

3. **백업**
   - 정기적으로 데이터베이스 백업
   - Storage 파일 백업 설정

## 지원

문제가 있으시면 GitHub Issues에 문의해주세요.