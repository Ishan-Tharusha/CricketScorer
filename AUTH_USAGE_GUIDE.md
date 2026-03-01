# Authentication Usage Guide

## Overview
This project uses NextAuth.js v5 with Google OAuth and MongoDB for session management.

---

## 1. Client-Side Session Usage

### Check User Session in Components

```tsx
"use client";

import { useSession } from "next-auth/react";

export function MyComponent() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;

  if (!session?.user) {
    return <div>Please sign in</div>;
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

### Access User Data

```tsx
const { data: session } = useSession();

// Available properties:
session?.user?.email      // User's email
session?.user?.name       // User's name
session?.user?.image      // User's profile picture
session?.user?.id         // User's unique ID from MongoDB
```

---

## 2. Using Custom Hooks

### useRequireAuth Hook
Automatically redirects unauthenticated users to login page:

```tsx
"use client";

import { useRequireAuth } from "@/hooks/useAuth";

export default function DashboardPage() {
  const { session, isLoading } = useRequireAuth("/login");

  if (isLoading) return <div>Loading...</div>;

  return <div>Welcome, {session?.user?.name}!</div>;
}
```

### useUser Hook
Simplified hook for getting current user:

```tsx
"use client";

import { useUser } from "@/hooks/useAuth";

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useUser();

  if (isLoading) return <div>Loading...</div>;

  return <div>User: {user?.email}</div>;
}
```

---

## 3. Server-Side Session Access

### In API Routes

```typescript
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();

  // Check if user is authenticated
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use user info
  const userEmail = session.user.email;
  
  // Your API logic here
  return Response.json({ success: true });
}
```

### In Server Actions

```typescript
"use server";

import { auth } from "@/auth";

export async function getUserMatches() {
  const session = await auth();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  // Fetch matches for authenticated user
  // ...
}
```

---

## 4. Sign In / Sign Out

### Using AuthButtons Component

```tsx
import { AuthButtons } from "@/components/AuthButtons";

export function Header() {
  return (
    <header>
      <AuthButtons />
    </header>
  );
}
```

### Manual Sign In / Sign Out

```tsx
"use client";

import { signIn, signOut } from "next-auth/react";

export function AuthControls() {
  return (
    <div>
      <button onClick={() => signIn("google")}>
        Sign in with Google
      </button>
      
      <button onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </button>
    </div>
  );
}
```

### Sign In with Redirect

```tsx
// Sign in and redirect to dashboard after successful authentication
signIn("google", { callbackUrl: "/matches" });
```

---

## 5. Protecting Routes

### Client-Side Route Protection

```tsx
"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect } from "react";

export default function ProtectedPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("google");
    }
  }, [status]);

  if (status === "loading") return <div>Loading...</div>;

  return <div>Protected content for {session?.user?.email}</div>;
}
```

### Using Middleware (Automatic)

Routes are automatically protected in `src/middleware.ts`:
- `/matches/*`
- `/teams/*`
- `/players/*`

Users trying to access these routes without authentication are redirected to `/login`.

---

## 6. Database Models with User Association

### Update Player Model to Include User

```typescript
import mongoose, { Schema, model, models } from "mongoose";
import type { IUser } from "./User";

export interface IPlayer {
  _id: string;
  fullName: string;
  userId: IUser["_id"]; // Associate player with user
  shortName?: string;
  battingStyle?: string;
  bowlingStyle?: string;
  isKeeper?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    fullName: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    shortName: String,
    battingStyle: String,
    bowlingStyle: String,
    isKeeper: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PlayerModel = models.Player ?? model<IPlayer>("Player", PlayerSchema);
```

### Update Match Model to Include User

```typescript
export interface IMatch {
  _id: string;
  userId: string; // User who created the match
  team1Id: string;
  team2Id: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  // ... other fields
}

const MatchSchema = new Schema<IMatch>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    team1Id: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    team2Id: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    status: { type: String, default: "NOT_STARTED" },
    // ... other fields
  },
  { timestamps: true }
);

export const MatchModel = models.Match ?? model<IMatch>("Match", MatchSchema);
```

---

## 7. Protected API Routes Example

### GET User's Matches

```typescript
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models/Match";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const matches = await MatchModel.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(10);

    return Response.json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return Response.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
```

### CREATE User Match

```typescript
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { MatchModel } from "@/lib/models/Match";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const match = await MatchModel.create({
      ...body,
      userId: session.user.id,
    });

    return Response.json(match, { status: 201 });
  } catch (error) {
    console.error("Error creating match:", error);
    return Response.json({ error: "Failed to create match" }, { status: 500 });
  }
}
```

---

## 8. Error Handling

### Handle Authentication Errors

```tsx
"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div>
      {error && (
        <div className="error">
          <p>Sign-in failed: {error}</p>
        </div>
      )}
      <button onClick={() => signIn("google")}>
        Try Again
      </button>
    </div>
  );
}
```

### Common Errors

- `OAuthCallback`: OAuth provider returned an error
- `OAuthSignin`: Error during sign-in
- `CredentialsSignin`: Invalid credentials (if using custom login)
- `SessionCallback`: Error in session callback

---

## 9. Logout and Session Cleanup

### Sign Out with Cleanup

```tsx
"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  const handleLogout = async () => {
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

---

## 10. Testing Authentication

### Check Authentication Status

```tsx
const { data: session, status } = useSession();

// status values:
// "loading" - Session is being loaded
// "authenticated" - User is signed in
// "unauthenticated" - User is not signed in
```

### Mock Session in Tests

```typescript
import { auth } from "@/auth";

// In your test file
jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue({
    user: {
      id: "test-user-id",
      email: "test@example.com",
      name: "Test User",
    },
  }),
}));
```

---

## Environment Variables Checklist

- [ ] `GOOGLE_CLIENT_ID` - From Google Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Console
- [ ] `NEXTAUTH_SECRET` - Generated via `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- [ ] `MONGODB_URI` - MongoDB connection string

---

## Useful Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth.js Providers](https://next-auth.js.org/providers)
- [MongoDB Adapter](https://authjs.dev/reference/adapter/mongodb)
- [Session Management](https://next-auth.js.org/getting-started/example#wrapping-your-application)
