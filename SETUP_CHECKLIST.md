# Google OAuth Setup Checklist ✅

## Step 1: Set Up Google OAuth Credentials
- [ ] Log in to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create a new project (or select existing)
- [ ] Go to **APIs & Services**
- [ ] Click **Create Credentials** → **OAuth Client ID**
- [ ] Select **Web Application**
- [ ] Add authorized redirect URIs:
  - [ ] `http://localhost:3000/api/auth/callback/google` (development)
  - [ ] `https://yourdomain.com/api/auth/callback/google` (production)
- [ ] Copy **Client ID**
- [ ] Copy **Client Secret**

## Step 2: Create Environment Variables
- [ ] Create `.env.local` file in project root
- [ ] Add `GOOGLE_CLIENT_ID`
- [ ] Add `GOOGLE_CLIENT_SECRET`
- [ ] Generate `NEXTAUTH_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
  Or use Node.js:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Add `NEXTAUTH_URL=http://localhost:3000`
- [ ] Add `MONGODB_URI` (or `MONGO_URI`)

**Sample `.env.local`:**
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cricket-scorer
```

## Step 3: Verify Installation
- [ ] Check that packages are installed:
  ```bash
  npm list next-auth @auth/mongodb-adapter
  ```
- [ ] Run TypeScript check:
  ```bash
  npx tsc --noEmit
  ```

## Step 4: Test the Setup
- [ ] Start development server:
  ```bash
  npm run dev
  ```
- [ ] Visit `http://localhost:3000`
- [ ] Click "Sign In with Google" button
- [ ] Complete Google OAuth flow
- [ ] Check if user is created in MongoDB

## Step 5: Optional - Protect Routes
- [ ] Review `src/middleware.ts` (already configured)
- [ ] Update `matcher` array for routes you want to protect
- [ ] Test that unauthenticated access redirects to login

## Step 6: Update Your Models (Optional but Recommended)
- [ ] Add `userId` field to Player model
- [ ] Add `userId` field to Team model
- [ ] Add `userId` field to Match model
- [ ] Update API routes to associate data with current user

**Example Player model update:**
```typescript
export interface IPlayer {
  _id: string;
  userId: string; // Add this
  fullName: string;
  // ... other fields
}

const PlayerSchema = new Schema<IPlayer>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    // ... other fields
  },
  { timestamps: true }
);
```

## Step 7: Clear Protected Routes
- [ ] Test `/matches` route (should redirect to login if not authenticated)
- [ ] Test `/teams` route
- [ ] Test `/players` route
- [ ] Verify login redirects back to original page

## Step 8: Use AuthButtons in Your Pages
Already added to homepage! Check out:
- [ ] Review `src/components/AuthButtons.tsx`
- [ ] Review `src/app/page.tsx` (already updated)
- [ ] Add `<AuthButtons />` to other pages as needed

## Step 9: Protect Your API Routes
Example: Update `src/app/api/matches/route.ts`
```typescript
import { auth } from "@/auth";

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your API logic here
}
```

- [ ] Add auth check to match API routes
- [ ] Add auth check to team API routes
- [ ] Add auth check to player API routes

## Step 10: Test Complete Flow
- [ ] Sign in with Google
- [ ] Create a new match
- [ ] Verify match is associated with current user
- [ ] Sign out
- [ ] Verify you're redirected to login
- [ ] Sign in again
- [ ] Verify you can see your match

## Step 11: Handle Current Issues (if any)
- [ ] Check browser console for errors
- [ ] Check server logs (terminal running `npm run dev`)
- [ ] Verify all env variables are set
- [ ] Clear browser cookies/cache if needed
- [ ] Restart dev server if env was changed

## Step 12: Production Preparation
- [ ] Update `NEXTAUTH_URL` for production domain
- [ ] Update Google OAuth redirect URIs for production
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Set environment variables in your deployment platform
- [ ] Test complete flow on production

## Troubleshooting Commands

```bash
# Check if MongoDB is running
mongosh "mongodb+srv://..." --username <user>

# Verify env variables are loaded
node -e "console.log({
  googleId: !!process.env.GOOGLE_CLIENT_ID,
  googleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  secret: !!process.env.NEXTAUTH_SECRET,
  mongoUri: !!process.env.MONGODB_URI
})"

# Clear npm cache if having issues
npm cache clean --force
npm install
```

## Files Created

```
✅ src/auth.ts                              # NextAuth config
✅ src/middleware.ts                        # Route protection
✅ src/app/api/auth/[...nextauth]/route.ts  # Auth API handler
✅ src/app/login/page.tsx                   # Login page
✅ src/components/SessionProvider.tsx       # Session wrapper
✅ src/components/AuthButtons.tsx           # Login/logout buttons
✅ src/hooks/useAuth.ts                     # Custom auth hooks
✅ src/lib/models/User.ts                   # User model
✅ .env.local.example                       # Env template
✅ AUTH_SETUP_QUICK_START.md               # Quick start guide
✅ AUTH_USAGE_GUIDE.md                     # Detailed usage guide
✅ GOOGLE_OAUTH_SETUP.md                   # OAuth setup guide
```

## Need Help?

1. **Read the guides:**
   - [AUTH_SETUP_QUICK_START.md](./AUTH_SETUP_QUICK_START.md)
   - [AUTH_USAGE_GUIDE.md](./AUTH_USAGE_GUIDE.md)
   - [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

2. **Check NextAuth.js docs:** https://next-auth.js.org/

3. **Common issues:**
   - Callback URL mismatch → Update in Google Console
   - Missing env variables → Check .env.local
   - MongoDB connection → Verify connection string
   - Session not persisting → Check NEXTAUTH_SECRET

---

**Status:** ✅ Ready for configuration and testing
