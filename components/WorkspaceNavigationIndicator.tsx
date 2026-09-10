type WorkspaceNavigationIndicatorProps = {
  count: number;
  hasIssue?: boolean;
  collapsed?: boolean;
};

export function getWorkspaceIndicatorLabel(
  count: number,
  label: string,
  issueCount = 0
) {
  const itemLabel = count === 1 ? label : `${label}s`;
  if (issueCount > 0) {
    const issueLabel = issueCount === 1 ? "1 needing attention" : `${issueCount} needing attention`;
    return `${count} ${itemLabel}, including ${issueLabel}`;
  }
  return `${count} ${itemLabel}`;
}

export default function WorkspaceNavigationIndicator({
  count,
  hasIssue = false,
  collapsed = false,
}: WorkspaceNavigationIndicatorProps) {
  if (count <= 0) return null;

  return (
    <span
      aria-hidden="true"
      className={`${
        collapsed ? "absolute right-1 top-1" : "relative ml-auto"
      } inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold tabular-nums leading-none ${
        hasIssue
          ? "border-lumina-attention/35 bg-lumina-attention-soft text-lumina-attention"
          : "border-lumina-glass-border bg-lumina-pearl text-lumina-text"
      }`}
    >
      {count > 99 ? "99+" : count}
      {hasIssue && (
        <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-lumina-attention" />
      )}
    </span>
  );
}
