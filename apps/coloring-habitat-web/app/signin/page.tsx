"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const SignInPage = () => {
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { signIn } = await import("next-auth/react");
    await signIn("resend", { email, callbackUrl: "/" });
    setEmailSent(true);
  };

  const handleGoogleSignIn = async () => {
    const { signIn } = await import("next-auth/react");
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <svg
            className="h-8 w-8"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="16" cy="16" r="16" fill="#E63956" />
            <path
              d="M10 20c0-5.5 4.5-10 10-10-.8 3-2.3 5.4-4.6 7.3S11.2 20 10 20z"
              fill="white"
              opacity="0.9"
            />
            <path
              d="M14 22c0-3.8 2.8-7 6.2-7-.4 2.3-1.5 4.2-3.1 5.4-1.2 1-2.3 1.6-3.1 1.6z"
              fill="white"
              opacity="0.6"
            />
          </svg>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Coloring Habitat
          </span>
        </Link>

        <h1 className="text-center text-2xl font-extrabold text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Sign in to save your creations and track your progress
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background py-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            <FontAwesomeIcon icon={faGoogle} />
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {emailSent ? (
            <div className="rounded-lg bg-accent/10 p-4 text-center">
              <p className="text-sm font-semibold text-accent">
                Check your email
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                We sent a magic link to {email}
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div className="relative">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size="sm"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full rounded-lg border border-border bg-background py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-shadow hover:shadow-md"
              >
                Continue with email
                <FontAwesomeIcon icon={faArrowRight} size="sm" />
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignInPage;
