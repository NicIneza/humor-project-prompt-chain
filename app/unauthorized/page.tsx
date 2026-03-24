import { SignOutButton } from "@/components/auth/sign-out-button";

export default function UnauthorizedPage() {
  return (
    <main className="page-shell">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Restricted</p>
          <h1 className="headline" style={{ fontSize: "clamp(2.2rem, 6vw, 3.8rem)" }}>
            This workspace is admin-only.
          </h1>
          <p className="subheadline">
            Your account authenticated successfully, but the matching profile row does not have{" "}
            <span className="code-block">is_superadmin</span> or <span className="code-block">is_matrix_admin</span>{" "}
            enabled.
          </p>
        </div>

        <div className="notice notice-error">
          <strong>Access denied</strong>
          Ask for the correct admin flag, then sign in again.
        </div>

        <div className="button-row">
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
