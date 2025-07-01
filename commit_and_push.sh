#!/bin/bash
cd /Users/eddy/class_easy

# Stage the fix
git add src/lib/server/database.js

# Commit
git commit -m "Fix Vercel build error: use dynamic env imports in server files

- Changed from $env/static/public to $env/dynamic/public in server-side files
- This fixes the build error where PUBLIC_SUPABASE_URL was not exported"

# Push to origin
git push origin main