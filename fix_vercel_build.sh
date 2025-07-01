#!/bin/bash
cd /Users/eddy/class_easy

# Stage the fixes
git add src/lib/supabase.js src/hooks.server.js src/lib/stores/auth.js

# Commit
git commit -m "Fix Vercel build error: handle missing env variables gracefully

- Made Supabase client initialization conditional on env variables
- Added null checks in all Supabase-dependent functions
- Prevented runtime errors during build time
- Build will now succeed even without env variables set"

# Push to origin
git push origin main