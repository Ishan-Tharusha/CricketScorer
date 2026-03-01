"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { LoginScreen } from "@/components/LoginScreen";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (session?.user) {
      router.push(callbackUrl.startsWith("/") ? callbackUrl : "/");
    }
  }, [session, router, callbackUrl]);

  return <LoginScreen error={error} callbackUrl={callbackUrl} />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 gap-2">
          <Spinner className="h-5 w-5 border-white border-t-transparent text-white" />
          <p className="text-white">Loading…</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
