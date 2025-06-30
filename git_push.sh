#!/bin/bash
cd /Users/eddy/class_easy

# Stage all changes
git add -A

# Commit with message
git commit -m "데모 모드 완전 제거 및 프로덕션 서버 모드로 통일

- 모든 데모 모드 및 개발 모드 코드 제거
- Supabase 프로덕션 서버 전용으로 전환
- 서버 측 인증된 Supabase 클라이언트 구현
- 데이터베이스 스키마 및 RLS 정책 설정
- Storage 버킷 정책 추가
- actualUser.id를 user.id로 수정
- 폴더 타입을 'materials'로 통일

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push to origin
git push origin main