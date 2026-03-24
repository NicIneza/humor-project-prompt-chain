import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { requireAdminContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="page-shell">
        <section className="panel stack">
          <div>
            <p className="eyebrow">Configuration</p>
            <h1 className="headline" style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)" }}>
              Supabase credentials are missing.
            </h1>
            <p className="subheadline">
              Add the required public environment variables before loading the control room.
            </p>
          </div>
        </section>
      </main>
    );
  }

  await requireAdminContext();

  return (
    <main className="page-shell shell-stack">
      <header className="control-header">
        <div className="brand-column">
          <p className="eyebrow">Prompt Chain Studio</p>
          <Link className="brand-link" href="/dashboard">
            Humor flavors
          </Link>
        </div>

        <div className="header-tools">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {children}
    </main>
  );
}
