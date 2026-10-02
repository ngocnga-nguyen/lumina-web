type MenuAnchor = { top: number; right: number };
type MenuViewport = { width: number; height: number };

// Preserve the existing right alignment and top-12 offset, within the viewport.
export function getAccountMenuPosition(
  anchor: MenuAnchor,
  width: number,
  height: number,
  viewport: MenuViewport,
) {
  const inset = 12;
  return {
    top: Math.max(inset, Math.min(anchor.top + 48, viewport.height - height - inset)),
    left: Math.max(inset, Math.min(anchor.right - width, viewport.width - width - inset)),
  };
}
