"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";

function sameEmail(a?: string | null, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function canEditPlayer(
  session: { user?: { playerId?: string; role?: string; email?: string | null } } | null,
  playerId: string,
  player?: { createdBy?: string; email?: string } | null
): boolean {
  if (!session?.user) return false;
  if (session.user.role === "admin") return true;
  if (session.user.playerId === playerId) return true;
  if (sameEmail(session.user.email, player?.email)) return true;
  if (player?.createdBy && session.user.playerId && player.createdBy === session.user.playerId) return true;
  return false;
}

const schema = z.object({
  fullName: z.string().min(1),
  shortName: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional().transform((s) => (s === "" ? undefined : s)),
  isKeeper: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditPlayerPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) {
      setLoading(false);
      return;
    }
    fetch(`/api/players/${id}`)
      .then((r) => {
        if (r.status === 404) {
          router.replace("/players");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!canEditPlayer(session, id, data)) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        reset({
          fullName: data.fullName,
          shortName: data.shortName ?? "",
          email: data.email ?? "",
          isKeeper: data.isKeeper ?? false,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, reset, router, session, sessionStatus]);

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch(`/api/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError("Failed to update");
      return;
    }
    router.push(`/players/${id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2">
        <Spinner className="h-5 w-5 border-cricket-green border-t-transparent text-cricket-green" />
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="min-h-screen">
        <header className="page-header">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
            <Link href="/players">←</Link>
          </Button>
          <h1 className="text-xl font-bold flex-1 text-center">Edit Player</h1>
          <div className="w-10" />
        </header>
        <main className="p-4 max-w-lg mx-auto">
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-6 text-center">
              <p className="font-medium text-amber-900 mb-2">You can only edit your own player profile.</p>
              <p className="text-sm text-amber-800 mb-4">This player is linked to another account. Admins can edit any player.</p>
              <Button asChild className="rounded-xl">
                <Link href="/players">Back to Players</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href={`/players/${id}`}>←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">Edit Player</h1>
        <div className="w-10" />
      </header>
      <main className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-5 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input id="fullName" {...register("fullName")} className="h-11" />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short name</Label>
                <Input id="shortName" {...register("shortName")} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional, for future login)</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="e.g. john@example.com"
                  className="h-11"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <Controller
                name="isKeeper"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox id="keeper" checked={field.value} onCheckedChange={field.onChange} />
                    <Label htmlFor="keeper" className="cursor-pointer font-normal">Wicket keeper</Label>
                  </div>
                )}
              />
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full h-11">Save</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
