# Google OAuth Setup Guide

## 1. Create Google OAuth Credentials

### Steps:
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth Client ID**
5. Choose **Web Application**
6. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
7. Copy your **Client ID** and **Client Secret**

## 2. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>?retryWrites=true&w=majority
# or if using local MongoDB:
# MONGO_URI=mongodb://localhost:27017/cricket-scorer

# NextAuth Config
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

### Generating NEXTAUTH_SECRET:
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Or use Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Authentication Features

### Using Authentication in Your Components:

**Protected Component Example:**
```tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

export default function Dashboard() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
      <button onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign Out
      </button>
    </div>
  );
}
```

### Using AuthButtons Component:
Add the `AuthButtons` component to your navigation/header:
```tsx
import { AuthButtons } from "@/components/AuthButtons";

export function Header() {
  return (
    <nav>
      {/* Your navigation items */}
      <AuthButtons />
    </nav>
  );
}
```

## 4. Middleware Setup (Optional - for protecting routes)

Create `src/middleware.ts` to automatically redirect unauthenticated users:

```typescript
export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protect these routes - adjust as needed
    "/matches/:path*",
    "/teams/:path*",
    "/players/:path*",
  ],
};
```

## 5. API Route Protection

To protect your existing API routes, add this at the start:

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

## 6. Session Data

Access session data in your components:

```typescript
import { useSession } from "next-auth/react";

const { data: session } = useSession();

// Access user info:
// session?.user?.email
// session?.user?.name
// session?.user?.image
// session?.user?.id
```

## 7. Troubleshooting

- **"Callback URL mismatch"**: Ensure your redirect URI in Google Console matches `NEXTAUTH_URL`
- **"NEXTAUTH_SECRET is missing"**: Add a secret to `.env.local`
- **"User not saving to database"**: Check MongoDB connection string
- **"Sign-in page shows error"**: Check Google credentials and callback URL

## 8. Production Deployment

- Update `NEXTAUTH_URL` to your production domain
- Regenerate `NEXTAUTH_SECRET` for production
- Update Google OAuth authorized redirect URIs
- Ensure MongoDB is accessible from your production environment
- Use environment variables in your deployment platform
