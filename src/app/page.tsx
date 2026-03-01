"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSession, signOut } from "next-auth/react";
import { LoginScreen } from "@/components/LoginScreen";
import { useSearchParams } from "next/navigation";

interface PlayerStatsResponse {
  matchesPlayed: number;
  batting: {
    runs: number;
    balls: number;
    innings: number;
    dismissals: number;
    average: number | null;
    strikeRate: number | null;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
  };
  bowling: {
    wickets: number;
    runsConceded: number;
    balls: number;
    economy: number | null;
    average: number | null;
  };
  runsPerInnings: number[];
}

function HomeContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [avatarError, setAvatarError] = useState(false);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [profileStats, setProfileStats] = useState<PlayerStatsResponse | null>(
    null,
  );
  const [profileStatsLoading, setProfileStatsLoading] = useState(false);

  const playerId = (session?.user as { playerId?: string } | undefined)
    ?.playerId;

  const handleAvatarError = useCallback(() => setAvatarError(true), []);

  useEffect(() => {
    if (!showProfileSheet || !playerId) {
      setProfileStats(null);
      return;
    }
    setProfileStatsLoading(true);
    fetch(`/api/players/${playerId}/stats`)
      .then((r) => r.json())
      .then((data) => {
        if (data.matchesPlayed !== undefined) setProfileStats(data);
        else setProfileStats(null);
      })
      .catch(() => setProfileStats(null))
      .finally(() => setProfileStatsLoading(false));
  }, [showProfileSheet, playerId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-6 w-6 border-cricket-green border-t-transparent text-cricket-green" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen error={error} callbackUrl={callbackUrl} />
    );
  }
  return (
    <div className="min-h-screen">
      <header className="page-header flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-3 shrink-0 min-w-0">
          <Image
            src="/logo.png"
            alt="Cricket Scoring"
            width={40}
            height={40}
            className="rounded-full object-cover bg-white/10 ring-2 ring-white/20 shrink-0"
          />
          <h1 className="text-lg sm:text-xl font-bold tracking-tight truncate">
            Cricket Scoring
          </h1>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowProfileSheet(true)}
            className="flex items-center gap-2 rounded-xl hover:bg-white/10 active:bg-white/20 p-2 -m-1 transition-colors min-h-[44px] min-w-[44px] sm:min-w-0"
          >
            {session.user?.image && !avatarError ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar URL from provider, dynamic
              <img
                src={session.user?.image ?? ""}
                alt={session.user?.name || "User"}
                width={32}
                height={32}
                className="rounded-full border-2 border-white/30 w-8 h-8 object-cover"
                referrerPolicy="no-referrer"
                onError={handleAvatarError}
              />
            ) : (
              <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/30 bg-white/20 text-white text-xs font-semibold">
                {session.user?.name?.slice(0, 2).toUpperCase() ?? "?"}
              </span>
            )}
            <span className="text-sm font-medium text-white/95 max-w-[120px] truncate hidden sm:inline">
              {session.user?.name}
            </span>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white/95 hover:bg-white/10"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>
      <main className="page-content">
        <div className="space-y-3 sm:space-y-4">
          <Card className="border-0 shadow-card overflow-hidden rounded-2xl transition-shadow hover:shadow-md active:scale-[0.99]">
            <Link href="/matches/new" className="block">
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-cricket-green/15 text-cricket-green text-2xl font-bold shrink-0">
                  +
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-foreground text-base">
                    New Match
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Create and start scoring
                  </p>
                </div>
                <span className="text-muted-foreground text-lg shrink-0">
                  →
                </span>
              </CardContent>
            </Link>
          </Card>
          <Card className="border-0 shadow-card overflow-hidden rounded-2xl transition-shadow hover:shadow-md active:scale-[0.99]">
            <Link href="/matches?status=IN_PROGRESS" className="block">
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-700 text-2xl shrink-0">
                  ▶
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-foreground text-base">
                    Resume Match
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Continue live scoring
                  </p>
                </div>
                <span className="text-muted-foreground text-lg shrink-0">
                  →
                </span>
              </CardContent>
            </Link>
          </Card>
          <Card className="border-0 shadow-card overflow-hidden rounded-2xl transition-shadow hover:shadow-md active:scale-[0.99]">
            <Link href="/matches" className="block">
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary text-secondary-foreground text-2xl shrink-0">
                  ≡
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="font-semibold text-foreground text-base">
                    Match History
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    View past scorecards
                  </p>
                </div>
                <span className="text-muted-foreground text-lg shrink-0">
                  →
                </span>
              </CardContent>
            </Link>
          </Card>
        </div>

        <nav className="mt-8 sm:mt-10 pt-6 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Manage
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 min-h-[48px] rounded-xl font-medium"
              asChild
            >
              <Link href="/players">Players</Link>
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 min-h-[48px] rounded-xl font-medium"
              asChild
            >
              <Link href="/teams">Teams</Link>
            </Button>
          </div>
        </nav>
      </main>

      {/* My profile sheet – open when clicking name */}
      <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>My profile</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {/* Profile */}
            <div className="flex flex-col items-center text-center">
              {session.user?.image && !avatarError ? (
                // eslint-disable-next-line @next/next/no-img-element -- profile image from provider
                <img
                  src={session.user?.image ?? ""}
                  alt={session.user?.name || "User"}
                  width={80}
                  height={80}
                  className="rounded-full border-2 border-border object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex items-center justify-center w-20 h-20 rounded-full border-2 border-border bg-muted text-2xl font-semibold text-muted-foreground">
                  {session.user?.name?.slice(0, 2).toUpperCase() ?? "?"}
                </span>
              )}
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {session.user?.name}
              </h2>
              {session.user?.email && (
                <p className="text-sm text-muted-foreground">
                  {session.user.email}
                </p>
              )}
            </div>

            {/* Stats (when linked to a player) */}
            {playerId ? (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-foreground mb-3">
                    My stats
                  </h3>
                  {profileStatsLoading ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Spinner className="h-4 w-4 shrink-0 border-cricket-green border-t-transparent text-cricket-green" />
                      Loading…
                    </p>
                  ) : profileStats ? (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium text-muted-foreground">
                          Matches played
                        </p>
                        <p className="text-2xl font-bold text-cricket-green">
                          {profileStats.matchesPlayed}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Batting
                          </p>
                          <p className="text-lg font-semibold">
                            {profileStats.batting.runs} runs
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Avg {profileStats.batting.average ?? "—"} · SR{" "}
                            {profileStats.batting.strikeRate ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {profileStats.batting.fours}×4 ·{" "}
                            {profileStats.batting.sixes}×6 ·{" "}
                            {profileStats.batting.fifties} 50s ·{" "}
                            {profileStats.batting.hundreds} 100s
                          </p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Bowling
                          </p>
                          <p className="text-lg font-semibold">
                            {profileStats.bowling.wickets} wkts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Econ {profileStats.bowling.economy ?? "—"} · Avg{" "}
                            {profileStats.bowling.average ?? "—"}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full" asChild>
                        <Link
                          href={playerId ? `/players/${playerId}` : "/players"}
                          onClick={() => setShowProfileSheet(false)}
                        >
                          View full player page →
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No stats yet. Play a match to see your stats here.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground border-t pt-4">
                Your account is not linked to a player yet. Stats will appear
                here after your next login.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center gap-2">
          <Spinner className="h-6 w-6 border-cricket-green border-t-transparent text-cricket-green" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
