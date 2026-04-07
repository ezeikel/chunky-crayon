import Link from "next/link";

const AuthErrorPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-extrabold text-foreground">
          Authentication error
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Something went wrong during sign in. Please try again.
        </p>
        <Link
          href="/signin"
          className="mt-6 inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition-shadow hover:shadow-md"
        >
          Try again
        </Link>
      </div>
    </div>
  );
};

export default AuthErrorPage;
