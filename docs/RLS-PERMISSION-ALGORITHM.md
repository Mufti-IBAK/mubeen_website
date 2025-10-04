# Universal Algorithm for RLS and Permission Handling

## Problem Pattern: "Permission Denied for Table Users"

This error occurs when client-side code tries to perform database operations that hit Row-Level Security (RLS) restrictions or complex joins involving auth.users table.

## Root Causes

1. **Direct Client-Side Database Operations**: Using Supabase client directly from frontend for admin operations
2. **RLS Policy Conflicts**: Policies blocking updates when complex relationships exist
3. **Auth Table Dependencies**: Operations that require access to auth.users which is protected
4. **Service Role Confusion**: Not using service role key where needed

## Universal Solution Algorithm

### Step 1: Identify the Operation Type

**CLIENT OPERATIONS (use anon key + RLS):**
- User reading their own data
- User updating their own profile
- Public content viewing
- User-scoped queries with proper RLS policies

**ADMIN OPERATIONS (use service role + verification):**
- Admin updating any user data
- Admin creating/updating programs, courses, forms
- Operations affecting auth.users table
- Complex operations with multiple table relationships

### Step 2: The Universal Pattern

For any admin operation that hits RLS restrictions:

```typescript
// ❌ WRONG: Direct client call
const { error } = await supabase.from('table').update(data).eq('id', id);

// ✅ CORRECT: Secure API route pattern
const res = await fetch('/api/admin/[resource]/[action]', {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Step 3: API Route Implementation Template

```typescript
// /api/admin/[resource]/[action]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function PUT(req: NextRequest) {
  try {
    // STEP 1: Verify admin authentication via SSR client (respects cookies)
    const cookieStore = await cookies();
    const supabaseSSR = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }); },
          remove(name: string, options: any) { cookieStore.set({ name, value: "", ...options }); },
        },
      }
    );

    const { data: userRes } = await supabaseSSR.auth.getUser();
    if (!userRes.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseSSR.from("profiles").select("role").eq("id", userRes.user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // STEP 2: Use service role client for actual operation (bypasses RLS)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    
    // STEP 3: Whitelist allowed fields and perform operation
    const body = await req.json();
    const allowedFields = ["field1", "field2", "field3"]; // Define what can be updated
    const patch: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) patch[field] = body[field];
    }

    const { error } = await supabaseAdmin.from("target_table").update(patch).eq("id", targetId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
```

### Step 4: Database Operations Classification

**USE CLIENT-SIDE (Anon Key + RLS):**
- `profiles` - reading/updating own profile
- `enrollments` - reading/creating own enrollments  
- `programs` - reading public program data
- `program_forms` - reading forms for registration
- `program_plans` - reading pricing plans

**USE SERVER-SIDE (Service Role Key):**
- `programs` - admin creating/updating programs
- `program_forms` - admin creating/updating forms
- `program_plans` - admin updating pricing
- `profiles` - admin updating user roles
- `enrollments` - admin updating enrollment status
- Operations involving auth.users relationships

## Implementation Checklist

### For Every Admin Operation:

1. **Create API Route**: `/api/admin/[resource]/[action]/route.ts`
2. **Verify Admin**: Use SSR client with cookies to check user auth + role
3. **Use Service Role**: Create admin client with service role key
4. **Whitelist Fields**: Only accept known safe fields in updates
5. **Handle Errors**: Return proper HTTP status codes
6. **Update Frontend**: Replace direct Supabase calls with fetch() to API route

### For Every User Operation:

1. **Check RLS Policies**: Ensure policies allow the operation
2. **Use Client-Side**: Use standard Supabase client with anon key
3. **Scope to User**: Operations should be limited to current user's data
4. **Handle Auth**: Redirect to login if user not authenticated

## Error Prevention

### Environment Variables Required:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### RLS Policies Template:
```sql
-- For user operations
CREATE POLICY "users_read_own" ON table_name FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_update_own" ON table_name FOR UPDATE USING (auth.uid() = user_id);

-- For admin operations  
CREATE POLICY "admin_full_access" ON table_name FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

## Testing Strategy

1. **Test with Regular User**: Ensure they can't access admin operations
2. **Test with Admin User**: Ensure all admin operations work via API routes
3. **Test Service Role Key**: Ensure it's properly configured and accessible
4. **Test Error Handling**: Ensure proper errors for unauthorized access

## Common Mistakes to Avoid

1. **Never use service role key on client-side**
2. **Never skip admin verification before using service role**
3. **Never accept arbitrary fields in API routes - always whitelist**
4. **Never forget to await cookies() in API routes**
5. **Never mix client operations with admin operations in same function**

This algorithm resolves permission errors universally by ensuring proper separation of concerns and secure elevation of privileges only when necessary.
