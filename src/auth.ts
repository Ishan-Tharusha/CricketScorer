import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dns from "dns";
import { connectDB } from "@/lib/db";
import { PlayerModel } from "@/lib/models";

// Fix DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }: any) {
      if (url.startsWith("/api/auth/signin")) {
        return baseUrl;
      }
      // Allow same-origin callback URLs (e.g. /matches)
      if (url.startsWith(baseUrl)) {
        return url;
      }
      // Relative path from client (e.g. "/matches") – resolve against baseUrl
      if (typeof url === "string" && url.startsWith("/")) {
        return `${baseUrl.replace(/\/$/, "")}${url}`;
      }
      return baseUrl;
    },
    async jwt({ token, user, profile }: any) {
      // Logger: see what we get from Google on sign-in
      if (user || profile) {
        console.log("[NextAuth] jwt callback – user object:", JSON.stringify(user ?? null, null, 2));
        console.log("[NextAuth] jwt callback – profile (Google):", JSON.stringify(profile ?? null, null, 2));
      }
      // Persist Google profile picture (and name/email) into the token so they appear in session
      if (profile?.picture) {
        token.picture = profile.picture;
      }
      if (profile?.name) {
        token.name = profile.name;
      }
      if (profile?.email) {
        token.email = profile.email;
      }
      if (user?.id) {
        token.sub = user.id;
      }

      const email = profile?.email ?? token.email;
      if (email) {
        try {
          await connectDB();
          let player = await PlayerModel.findOne({ email }).lean();
          if (!player && profile?.email) {
            // Only create on sign-in (when we have profile)
            const mongoose = await import("mongoose");
            const newPlayer = await PlayerModel.create({
              fullName: profile.name || profile.email || "Player",
              email: profile.email,
              _id: new mongoose.Types.ObjectId().toString(),
            });
            player = newPlayer.toObject();
            console.log("[NextAuth] Created new player for logged-in user:", { email: profile.email, playerId: player._id });
          } else if (player && profile?.email) {
            console.log("[NextAuth] Matched existing player by email:", { email: profile.email, playerId: player._id });
          }
          if (player) {
            token.playerId = String(player._id);
            token.role = player.role === "admin" ? "admin" : undefined;
          }
        } catch (err) {
          console.error("[NextAuth] Failed to find/create player by email:", err);
        }
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token) {
        session.user.id = token.sub;
        // Pass Google profile picture into session.user.image so it shows in the UI
        if (token.picture) {
          session.user.image = token.picture;
        }
        if (token.name) {
          session.user.name = token.name;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        // Player linked to this account (by email); created on first login if missing
        if (token.playerId) {
          session.user.playerId = token.playerId;
        }
        // Use only our app role from Player (ignore provider fields like "Customer")
        session.user.role = token.role === "admin" ? "admin" : undefined;
      }
      // Logger: see what session.user we send to the client
      console.log("[NextAuth] session callback – session.user:", JSON.stringify(session?.user ?? null, null, 2));
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
  // Required for NextAuth v5
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

console.log("[NextAuth] Initialized:", {
  hasHandlers: !!handlers,
  hasAuth: !!auth,
  hasSignIn: !!signIn,
  hasSignOut: !!signOut,
});
