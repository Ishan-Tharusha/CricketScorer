import "next-auth";

declare module "next-auth" {
  interface User {
    id?: string;
    playerId?: string;
    role?: string;
  }

  interface Session {
    user: User & {
      id?: string;
      playerId?: string;
      role?: string;
    };
  }
}
