type ModalShellProps = {
  children: React.ReactNode;
  eyebrow?: string;
  onClose: () => void;
  title: string;
};

export function ModalShell({ children, eyebrow, onClose, title }: ModalShellProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-modal="true"
        className="modal-card"
        role="dialog"
      >
        <div className="split-header">
          <div className="stack" style={{ gap: "0.35rem" }}>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 className="modal-title">{title}</h2>
          </div>
          <button className="button button-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}
