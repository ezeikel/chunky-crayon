import Link from "next/link";

const VerifyRequestPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
          <svg
            className="h-8 w-8 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-foreground">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A sign-in link has been sent to your email address. Click the link to
          complete your sign in.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
};

export default VerifyRequestPage;
