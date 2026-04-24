import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";

export const dynamic = "force-dynamic";

const LOGIN_CAPTION_LANES = [
  [
    "draft: campus glamour with the emotional lighting of a vending machine",
    "draft: everyone here looks aggressively available for networking",
    "draft: library martyrdom in business casual",
    "draft: pretending this group project is a personality trait",
    "draft: the tote bag understood the assignment first",
  ],
  [
    "pass two: dry enough to feel deliberate",
    "pass two: sharper than the pose deserves",
    "pass two: dark, subtle, and still readable",
    "pass two: built for review before it lands",
    "pass two: weird on purpose, not by accident",
  ],
  [
    "queue: roast the staging, not the person",
    "queue: let the joke feel earned on second read",
    "queue: keep it sharp without sounding forced",
    "queue: every image gets a cleaner final pass",
    "queue: caption candidates move fast here",
  ],
  [
    "review: test runs come back ready to compare",
    "review: draft language stays dry and readable",
    "review: the pipeline trims the corny parts first",
    "review: every lane is built for quick iteration",
    "review: humor flavor tweaks stay organized",
  ],
  [
    "final: weird enough to feel original",
    "final: deadpan without going flat",
    "final: one image in, better caption out",
    "final: prompt chain edits stay easy to manage",
    "final: built for caption testing and cleanup",
  ],
] as const;

function getMessage(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const isConfigured = isSupabaseConfigured();

  if (isConfigured) {
    const { user, isAdmin } = await getSessionContext();

    if (user) {
      redirect(isAdmin ? "/dashboard" : "/unauthorized");
    }
  }

  const message = getMessage(resolvedSearchParams?.message);

  return (
    <main className="page-shell">
      <section className="page-card login-shell">
        <div className="login-panel">
          <div className="stack" style={{ gap: "0.85rem" }}>
            <p className="eyebrow">Prompt Chain Studio</p>
            <h1 className="headline">Shape humor flavors before they hit the caption pipeline.</h1>
          </div>

          <section className="login-visual-panel" aria-hidden="true">
            <div className="login-flow-board">
              <div className="login-flow-orb login-flow-orb-a" />
              <div className="login-flow-orb login-flow-orb-b" />
              <div className="login-caption-lanes">
                {LOGIN_CAPTION_LANES.map((lane, laneIndex) => (
                  <div
                    className={`login-caption-marquee ${
                      laneIndex % 2 === 1 ? "login-caption-marquee-reverse" : ""
                    }`}
                    key={`lane-${laneIndex}`}
                  >
                    <div
                      className="login-caption-track"
                      style={{ animationDuration: `${24 + laneIndex * 3}s` }}
                    >
                      {[...lane, ...lane].map((caption, captionIndex) => (
                        <span className="login-caption-chip" key={`lane-${laneIndex}-${captionIndex}`}>
                          {caption}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="stack" style={{ gap: "0.85rem" }}>
            {message ? (
              <div className="notice notice-error">
                <strong>Sign-in issue</strong>
                {message}
              </div>
            ) : null}

            {!isConfigured ? (
              <div className="notice notice-error">
                <strong>Missing environment variables</strong>
                Add <span className="code-block">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
                <span className="code-block">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>, then restart the app.
              </div>
            ) : null}

            <GoogleSignInButton disabled={!isConfigured} />
          </div>
        </div>
      </section>
    </main>
  );
}
