// The browser's own full screen, where it exists (not on iPhone Safari), and the focus trap
// for the page's full-screen dialog.

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export const FULLSCREEN_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const;

/** Whether the browser is showing something full screen right now. */
export function isNativeFullscreen(document: Document): boolean {
  const doc = document as FullscreenDocument;
  return !!(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * Asks the browser to hide its own bars. Returns whether it could be asked at all; `onRefused`
 * runs if the browser then says no.
 */
export function requestNativeFullscreen(document: Document, onRefused: () => void): boolean {
  const root = document.documentElement as FullscreenElement;
  const request = root.requestFullscreen ?? root.webkitRequestFullscreen;
  if (!request) return false;
  try {
    Promise.resolve(request.call(root)).catch(onRefused);
    return true;
  } catch {
    // Not allowed here.
    return false;
  }
}

export function exitNativeFullscreen(document: Document): void {
  if (!isNativeFullscreen(document)) return;
  const doc = document as FullscreenDocument;
  try {
    const exit = doc.exitFullscreen ?? doc.webkitExitFullscreen;
    Promise.resolve(exit?.call(doc)).catch(() => undefined);
  } catch {
    // Already left.
  }
}

/** Keeps Tab inside `dialog`. */
export function trapFocus(event: KeyboardEvent, dialog: HTMLElement): void {
  if (event.key !== 'Tab') return;
  const focusable = [
    ...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]',
    ),
  ];
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = dialog.ownerDocument.activeElement;
  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}
