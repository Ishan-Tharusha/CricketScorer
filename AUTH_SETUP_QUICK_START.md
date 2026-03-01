# - Google OAuth Setup

## Quick Start

1. **Copy `.env.local.example` to `.env.local`**

   ```bash
   cp .env.local.example .env.local
   ```

2. **Follow [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)** for complete instructions

3. **Fill in your credentials in `.env.local`**

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Visit http://localhost:3000/login** to test OAuth

## What's Included

- ✅ Google OAuth authentication with NextAuth.js
- ✅ MongoDB user session storage
- ✅ Protected routes middleware
- ✅ Authentication UI components
- ✅ Login page with error handling
- ✅ User session management

## File Structure

```
src/
├── auth.ts                              # NextAuth configuration
├── middleware.ts                        # Route protection middleware
├── app/
│   ├── layout.tsx                       # Updated with SessionProvider
│   ├── login/
│   │   └── page.tsx                    # Login page
│   └── api/auth/[...nextauth]/
│       └── route.ts                    # NextAuth API handler
├── components/
│   ├── SessionProvider.tsx             # Session wrapper
│   └── AuthButtons.tsx                 # Login/logout button component
└── lib/
    └── models/
        └── User.ts                     # MongoDB User model
```

## Next Steps

1. Create protected pages/components that check for sessions
2. Add user association to existing models (Player, Team, Match)
3. Update API routes to verify user authentication
4. Test OAuth flow with your Google credentials
