# Classroom Links Feature Documentation

## Overview
This feature allows administrators to assign classroom access links to paid enrollments, enabling students to join their respective online classrooms directly from their dashboard.

## Implementation Summary

### 1. Database Schema
**Table:** `class_links`

**Location:** `sql/create_class_links_table.sql`

**Structure:**
- `id`: Primary key (BIGSERIAL)
- `enrollment_id`: Reference to `success_enroll.id` (UNIQUE constraint)
- `user_id`: UUID of the student
- `program_id`: Reference to `programs.id`
- `classroom_link`: TEXT - the actual classroom URL
- `created_by`: UUID of admin who created the link
- `updated_by`: UUID of admin who last updated the link
- `created_at`: Timestamp (default NOW())
- `updated_at`: Timestamp (auto-updated via trigger)

**Security:**
- Row Level Security (RLS) enabled
- Admins have full access (create, read, update, delete)
- Users can only view their own links
- Automatic `updated_at` timestamp via trigger

**Indexes:**
- `idx_class_links_enrollment_id` on `enrollment_id`
- `idx_class_links_user_id` on `user_id`
- `idx_class_links_program_id` on `program_id`
- `idx_class_links_user_program` on `(user_id, program_id)`

### 2. API Routes

#### Admin Routes

**POST `/api/admin/class-links/upsert`**
- **Purpose:** Create or update a classroom link
- **Auth:** Admin only
- **Request Body:**
  ```json
  {
    "enrollment_id": number,
    "classroom_link": string  // Empty string to delete
  }
  ```
- **Response:**
  ```json
  {
    "ok": true,
    "data": { /* link object */ },
    "deleted": true  // if link was removed
  }
  ```
- **Features:**
  - Automatically fetches user_id and program_id from enrollment
  - Updates existing link or creates new one
  - Empty string deletes the link
  - Tracks which admin created/updated the link

#### User Routes

**GET `/api/class-links/my-links`**
- **Purpose:** Fetch all classroom links for authenticated user
- **Auth:** User authentication required
- **Response:**
  ```json
  {
    "ok": true,
    "links": {
      "enrollment_id_1": "https://classroom.url/1",
      "enrollment_id_2": "https://classroom.url/2"
    }
  }
  ```
- **Security:** RLS ensures users only see their own links

### 3. Admin Interface

**Location:** `src/app/admin/registrations/user/[id]/client.tsx`

**Features:**
- **New Column:** "Classroom" shows link status (✓ Added / No link)
- **Add/Edit Link Button:** Opens modal for managing classroom links
- **Modal Features:**
  - URL input with placeholder
  - Validation for URL format
  - Help text explaining functionality
  - Empty value removes the link
  - Accessible with proper ARIA labels
- **Visual Indicators:** Green badge shows when link exists

**User Flow:**
1. Admin navigates to registrations view
2. Clicks "View Details" for a user
3. Sees all paid enrollments in table
4. Clicks "Add Link" or "Edit Link" button
5. Modal opens with current link (if exists)
6. Admin enters/edits classroom URL
7. Clicks "Save" - link is immediately saved
8. To remove: clear the field and save

### 4. Student Interface

**Location:** `src/app/dashboard/registrations/page.tsx`

**Features:**
- **Join Classroom Button:** Appears only when link exists
- **Button Behavior:**
  - Opens classroom in new tab
  - Includes security attributes (`noopener noreferrer`)
  - Accessible with descriptive aria-label
- **URL Handling:** Automatically ensures absolute URLs

**User Flow:**
1. Student logs in and navigates to "My Registrations"
2. Sees list of paid enrollments
3. If admin added classroom link, sees "Join Classroom" button
4. Clicks button → opens classroom in new tab
5. If no link, button doesn't appear

### 5. Accessibility Features

**Screen Reader Support:**
- All modals have proper `role="dialog"` and `aria-modal="true"`
- Modal titles use `aria-labelledby`
- Form inputs have associated labels with `htmlFor`
- Help text linked with `aria-describedby`
- Buttons have descriptive `aria-label` attributes
- Background overlays marked with `aria-hidden="true"`

**Keyboard Navigation:**
- All interactive elements are keyboard accessible
- Modal can be closed with Cancel button
- Tab order follows logical flow
- Focus management in modals

**Semantic HTML:**
- Proper heading hierarchy (`h2`, `h3`)
- `<section>` and `<article>` elements
- Labeled form controls
- Accessible tables with proper headers

### 6. Security Considerations

**Authorization:**
- Only admins can create/update/delete links
- API routes verify admin role before allowing operations
- Service role key used for database operations

**Data Validation:**
- Enrollment ID must be valid number
- Classroom link must be string type
- Empty strings explicitly handled for deletion
- URL validation on client side (input type="url")

**Row Level Security:**
- Users can only see links for their own enrollments
- Admins can see and manage all links
- Database enforces policies at the data layer

### 7. Testing Checklist

- [ ] Run SQL script to create `class_links` table
- [ ] Verify RLS policies work correctly
- [ ] Admin can add link to enrollment
- [ ] Admin can edit existing link
- [ ] Admin can delete link (empty field)
- [ ] Student sees "Join Classroom" button when link exists
- [ ] Student cannot see button when no link
- [ ] Clicking button opens correct URL in new tab
- [ ] Multiple enrollments handled correctly
- [ ] Links persist across page refreshes
- [ ] TypeScript compilation passes
- [ ] No ESLint errors
- [ ] Accessibility audit passes
- [ ] Screen reader testing completed

### 8. Future Enhancements

Potential improvements for future iterations:
- Bulk link assignment for multiple students
- Link expiration dates
- Attendance tracking via classroom links
- Email notifications when link is added
- Link analytics (click tracking)
- Template links for programs
- Link validation (check if URL is accessible)

### 9. Troubleshooting

**Issue:** Admin can't save link
- **Check:** Admin role in database profiles table
- **Check:** Service role key in environment variables
- **Check:** Network tab for API errors

**Issue:** Student doesn't see Join button
- **Check:** Enrollment status is 'paid' in success_enroll table
- **Check:** Link exists in class_links table for that enrollment_id
- **Check:** User is logged in correctly

**Issue:** Link opens to wrong page
- **Check:** URL format in class_links table
- **Check:** `ensureAbsoluteUrl` function working correctly

## Files Modified/Created

### Created:
1. `sql/create_class_links_table.sql` - Database schema
2. `src/app/api/admin/class-links/upsert/route.ts` - Admin API
3. `src/app/api/class-links/my-links/route.ts` - User API
4. `docs/CLASSROOM_LINKS_FEATURE.md` - This documentation

### Modified:
1. `src/app/admin/registrations/user/[id]/client.tsx` - Admin UI
2. `src/app/dashboard/registrations/page.tsx` - Student UI

## Deployment Steps

1. **Database Setup:**
   ```bash
   # Run SQL script in Supabase SQL editor
   psql $DATABASE_URL < sql/create_class_links_table.sql
   ```

2. **Build and Test:**
   ```bash
   npm run build
   npx tsc --noEmit
   ```

3. **Deploy:**
   ```bash
   # Deploy to your hosting platform
   git add .
   git commit -m "feat: add classroom links feature"
   git push
   ```

4. **Verify:**
   - Test admin flow in production
   - Test student flow in production
   - Check database has correct data

## Support

For issues or questions about this feature, contact the development team or refer to the main project documentation.
