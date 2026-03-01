"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface LoginScreenProps {
  /** Auth error message from URL (e.g. searchParams.get("error")) */
  error?: string | null;
  /** Where to redirect after sign-in (default "/") */
  callbackUrl?: string;
}

export function LoginScreen({ error, callbackUrl = "/" }: LoginScreenProps) {
  const [logoSrc, setLogoSrc] = useState("/logo.png");
  const [logoHidden, setLogoHidden] = useState(false);
  const [bgSrc, setBgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      setLogoSrc((prev) =>
        prev.startsWith("http") ? prev : `${origin}${prev}`,
      );
      setBgSrc(`${origin}/api/bg`);
    }
  }, []);

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full p-4 safe-area-pb overflow-hidden bg-gray-800">
      {bgSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- background from /api/bg; Next/Image had load issues with dynamic full-screen bg
        <img
          src={bgSrc}
          alt=""
          role="presentation"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          onLoad={() => console.log("[LoginScreen] Background image loaded")}
          onError={() => console.error("[LoginScreen] Background image failed to load:", bgSrc)}
        />
      )}
      <div className="absolute inset-0 bg-black/50 z-[1]" aria-hidden />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          {!logoHidden && (
            <div className="flex justify-center mb-6 min-h-[70px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic src with fallback to logo.jpeg */}
              <img
                src={logoSrc}
                alt="Cricket Scorer logo"
                className="max-w-[220px] max-h-[90px] w-auto h-auto object-contain"
                onError={() => {
                  if (logoSrc.endsWith("logo.png")) {
                    setLogoSrc(
                      typeof window !== "undefined"
                        ? `${window.location.origin}/logo.jpeg`
                        : "/logo.jpeg",
                    );
                  } else {
                    setLogoHidden(true);
                  }
                }}
              />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-gray-900">
            Cricket Scorer
          </h1>
          <p className="text-gray-600 text-center mb-6 sm:mb-8 text-sm sm:text-base">
            Sign in to your account to continue
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              <p className="font-semibold">Error: {error}</p>
              <p className="text-sm mt-1">
                Please check your credentials and try again.
              </p>
            </div>
          )}

          <Button
            onClick={() => signIn("google", { callbackUrl })}
            className="w-full h-12 min-h-[48px] mb-4 bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-medium"
            size="lg"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <image
                href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMjMuNDczIDExLjExNDJjMC0uODIwNy0uMDcxNC0xLjYwOTgtLjE5ODItMi4zNjk4SDEydjQuNDc5Mkg5LjE5MWMtLjEwNzctLjY5NTItLjc5MjItMS42NzEtMS42NzY0LTIuNDQ1VjcuNzkyOGg0LjEyMTJDMTQuODk0IDYuOTE3NiAxNy45MDEgNS4zMDU1IDE4LjQ1IDMuMDc0NUgxOC40NzdWMy4wNzQ1Yy0xLjM0OTcgMS4wMDA4LTMuMDg4MiAxLjU5MTgtNC44NDcgMS43MDk3di4zMDMxYzAgMS41NjQtLjM1IDE2LjMxMjgtLjM1IDE2LjMxMjgtMi4xMDM4IDAtMy4wODgyLS4yNzQtMy4wODgyLS4yNzRzLS40ODM2LS41NTctMS4xNjQ2LTEuMTUwOGMtMS45MzI3LTEuNzI3My0zLjA4ODItNS4yMDYtMy4wODgyLTkuMDMyIDAtMy44MjU2IDEuMTU1Ny03LjMwNDcgMy4wODgyLTkuMDMyMy43ODA2LS41OTMyIDEuMTY0Ni0xLjE1MDggMS4xNjQ2LTEuMTUwOHMuOTc1LTEuMDIxNCAzLjA4ODItMS4wMjE0djEuMDIxNGMwIC4xNTQuMDUgMS42NjIuMDUgMS42NjJoMi45Mjg4YzAtLjIxNi4wMzU3LTEuNTA0LjAzNTctMS41MDR2LTEuMDIxNGMxLjc2MjQuMTE3NiAzLjQ5OC42MjExIDQuODQ3IDEuNzA5NyIgZmlsbD0iIzQyODVGNCIvPjwvZz48L3N2Zz4="
                width="24"
                height="24"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                or continue as
              </span>
            </div>
          </div>

          <div className="text-center text-gray-600 text-sm">
            <p>Use your Google account to sign in securely</p>
          </div>
        </div>
      </div>
    </div>
  );
}
