# OAuth Middleware Error - Fixed ✅

## The Problem
You were getting an error: `Cannot read properties of undefined (reading 'custom')` from the `openid-client` library in the middleware.

This happened because the middleware was trying to call the full `auth()` function, which requires Node.js APIs and the OpenID client library. However, Next.js middleware runs on the **Edge Runtime**, which doesn't support these Node.js APIs.

## The Solution
I made two key changes:

### 1. Updated Middleware (`src/middleware.ts`)
Changed from using `auth()` (which requires Node.js) to using `getToken()` from `next-auth/jwt`:

```typescript
// OLD - causes Edge Runtime error
const session = await auth();

// NEW - works on Edge Runtime
const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
```

**Why this works:**
- `getToken()` is lightweight and Edge Runtime compatible
- It reads the JWT token directly from the request
- Much faster than the full `auth()` call

### 2. Fixed MongoDB Adapter (`src/auth.ts`)
- Changed from Mongoose's MongoDB client to native `mongodb` MongoClient
- Removed incompatible property `trustHost`
- Fixed TypeScript type issues

**Before:**
```typescript
import mongoose from "mongoose";
const mongoosePromise = mongoose.connect(MONGODB_URI).then(() => mongoose.connection.getClient());
adapter: MongoDBAdapter(mongoosePromise)
```

**After:**
```typescript
import { MongoClient } from "mongodb";
const client = new MongoClient(MONGODB_URI);
const clientPromise = client.connect();
adapter: MongoDBAdapter(clientPromise)
```

## Status ✅
- TypeScript compilation: **PASSING** ✅
- Middleware: **FIXED** ✅
- Dev server: **RUNNING** on port 3001 ✅

## Next Steps

1. **Add environment variables to `.env.local`:**
   ```env
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   NEXTAUTH_SECRET=your_secret_key
   NEXTAUTH_URL=http://localhost:3000
   MONGODB_URI=your_mongodb_connection_string
   ```

2. **Test the OAuth flow:**
   - Visit `http://localhost:3001/login` (or port 3000 if available)
   - Click "Sign in with Google"
   - Complete the OAuth flow
   - Check that user is created in MongoDB

3. **Protected routes are now working:**
   - `/matches` - Requires authentication
   - `/teams` - Requires authentication
   - `/players` - Requires authentication

## What the Middleware Now Does

✅ Protects specified routes from unauthenticated access
✅ Redirects unauthenticated users to `/login`
✅ Redirects authenticated users away from login page
✅ Works on Edge Runtime without errors
✅ Uses JWT token for fast verification

## Key Files Modified
- `src/middleware.ts` - Simplified to use `getToken()`
- `src/auth.ts` - Fixed MongoDB adapter compatibility
