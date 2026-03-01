/** Central query keys for TanStack Query. Use when invalidating after mutations. */
export const queryKeys = {
  matches: (
    filter?: string,
    userId?: string,
    playerId?: string,
    page?: number,
  ) => ["matches", filter, userId ?? "", playerId ?? "", page ?? 1] as const,
  match: (id: string) => ["match", id] as const,
  teams: () => ["teams"] as const,
  /** Teams page: list + stats per team. Keep separate from teams() so cache shape matches. */
  teamsWithStats: () => ["teams", "withStats"] as const,
  teamStats: (id: string) => ["teamStats", id] as const,
  players: (search?: string) => ["players", search ?? ""] as const,
  player: (id: string) => ["player", id] as const,
  playerStats: (id: string) => ["playerStats", id] as const,
};
