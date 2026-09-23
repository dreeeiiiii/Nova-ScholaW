type EmptyStateProps = {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
};

/**
 * Small muted empty state: thin-stroke icon + one line + optional action.
 * No illustration, no card chrome. Reused by every (app) list section.
 */
export function EmptyState({ icon, message, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-start gap-3"
      style={{
        paddingBlock: "var(--space-8)",
        paddingInline: "var(--space-4)",
        borderTop: "1px solid var(--color-line)",
        borderBottom: "1px solid var(--color-line)",
        color: "var(--color-muted)",
      }}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <p className="tokens-body" style={{ color: "var(--color-muted)" }}>
        {message}
      </p>
      {action}
    </div>
  );
}
