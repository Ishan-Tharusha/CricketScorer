"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const schema = z.object({
  fullName: z.string().min(1, "Name required"),
  shortName: z.string().optional(),
  email: z.union([z.string().email("Invalid email"), z.literal("")]).optional().transform((s) => (s === "" ? undefined : s)),
  isKeeper: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewPlayerPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { isKeeper: false, email: "" },
  });

  async function onSubmit(data: FormData) {
    setError("");
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error?.message ?? "Failed to create player");
      return;
    }
    router.push("/players");
  }

  return (
    <div className="min-h-screen">
      <header className="page-header">
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 -ml-2" asChild>
          <Link href="/players">←</Link>
        </Button>
        <h1 className="text-xl font-bold flex-1 text-center">New Player</h1>
        <div className="w-10" />
      </header>
      <main className="p-4 max-w-lg mx-auto">
        <Card>
          <CardContent className="p-5 pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name *</Label>
                <Input
                  id="fullName"
                  {...register("fullName")}
                  placeholder="e.g. John Smith"
                  className="h-11"
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortName">Short name</Label>
                <Input
                  id="shortName"
                  {...register("shortName")}
                  placeholder="e.g. J. Smith"
                  className="h-11"
                />
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
                    <Checkbox
                      id="keeper"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <Label htmlFor="keeper" className="cursor-pointer font-normal">Wicket keeper</Label>
                  </div>
                )}
              />
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 py-2 px-3 rounded-md">{error}</p>
              )}
              <Button type="submit" className="w-full h-11">Create Player</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
