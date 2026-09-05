import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-forest-dark px-4 py-12">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 42px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 42px)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="brand-monogram flex h-16 w-16 items-center justify-center rounded-full shadow-lg">
            <span className="font-serif text-2xl font-bold text-forest-dark">CDC</span>
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold text-paper">
            Creative Dyes and Chemicals
          </h1>
          <p className="mt-1 text-sm tracking-wide text-paper/60">
            Ledger &amp; Accounts Register
          </p>
        </div>

        <div className="ledger-sheet rounded-md p-8 pl-14">
          <h2 className="mb-6 font-serif text-lg font-semibold text-forest-dark">
            Sign in to continue
          </h2>
          <LoginForm from={from} />
        </div>

        <p className="mt-6 text-center text-xs text-paper/40">
          Authorised personnel only. All entries are recorded.
        </p>
      </div>
    </main>
  );
}
