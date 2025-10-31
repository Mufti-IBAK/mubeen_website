# Classroom Links Feature - Quick Setup Guide

## ⚡ Quick Start

### Step 1: Create Database Table
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and run the SQL from `sql/create_class_links_table.sql`
4. Verify table creation by checking Tables section

### Step 2: Deploy Code
```bash
# Ensure no TypeScript errors
npx tsc --noEmit

# Build the project
npm run build

# Deploy (adjust based on your platform)
vercel --prod
# or
netlify deploy --prod
```

### Step 3: Test the Feature

#### As Admin:
1. Login as admin user
2. Navigate to `/admin/registrations`
3. Click "View Details" for any user with paid enrollments
4. Click "Add Link" button next to an enrollment
5. Enter a classroom URL (e.g., `https://zoom.us/j/123456789`)
6. Click "Save"
7. Verify green "✓ Added" badge appears

#### As Student:
1. Login as the student whose enrollment you added a link to
2. Navigate to `/dashboard/registrations`
3. Find the enrollment card
4. Verify "Join Classroom" button appears
5. Click button - should open the URL in new tab

## 📋 Verification Checklist

- [ ] `class_links` table exists in database
- [ ] RLS policies are enabled
- [ ] Admin can add classroom link
- [ ] Admin can edit existing link
- [ ] Admin can remove link (clear field and save)
- [ ] Student sees "Join Classroom" button
- [ ] Button opens correct URL
- [ ] No TypeScript errors
- [ ] No console errors in browser

## 🚨 Common Issues

### Admin can't save link
**Solution:** Check that user has admin role in profiles table:
```sql
SELECT id, role FROM profiles WHERE id = 'USER_UUID';
UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID';
```

### Student doesn't see button
**Solution:** Verify enrollment is marked as paid:
```sql
SELECT id, status FROM success_enroll WHERE user_id = 'USER_UUID';
```

### TypeScript errors
**Solution:** Run type check and fix any issues:
```bash
npx tsc --noEmit
```

## 📞 Need Help?

Refer to the complete documentation: `docs/CLASSROOM_LINKS_FEATURE.md`

## ✅ Success!

If all checks pass, the feature is ready for production use. Admins can now manage classroom links for all student enrollments.
