export default function WorkspaceLoadError({ message, onRetry }: {
  message: string; onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-[22px] border border-lumina-border p-6 text-[14px] text-lumina-text-muted">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-full bg-lumina-black px-5 text-[13px] font-medium text-white transition hover:bg-lumina-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lumina-text">
        Retry
      </button>
    </div>
  );
}
