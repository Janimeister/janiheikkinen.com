import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  inject,
  Injector,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { injectIsBrowser } from './platform';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface EarlyInput {
  control: Control;
  value: string;
  checked: boolean;
}

const isToggle = (control: Control): control is HTMLInputElement =>
  control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio');

/** Whether the visitor (or the browser, restoring a form) has changed a control from its HTML. */
function changed(control: Control): boolean {
  if (isToggle(control)) return control.checked !== control.defaultChecked;
  if (control instanceof HTMLSelectElement) {
    const initial = [...control.options].findIndex((option) => option.defaultSelected);
    return control.selectedIndex !== Math.max(0, initial);
  }
  return control.value !== control.defaultValue;
}

const read = (control: Control): EarlyInput => ({
  control,
  value: control.value,
  checked: isToggle(control) && control.checked,
});

const isControl = (target: EventTarget | null): target is Control =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLSelectElement ||
  target instanceof HTMLTextAreaElement;

/** What has been typed or picked on the prerendered page so far. */
export function captureEarlyInput(root: ParentNode): EarlyInput[] {
  return [...root.querySelectorAll<Control>('input, select, textarea')].filter(changed).map(read);
}

/**
 * Keeps noting what is typed or picked from now on, until `stop` is called; it returns
 * everything noted, the latest state of each control.
 */
export function recordEarlyInput(root: Document | HTMLElement): { stop(): EarlyInput[] } {
  const inputs = new Map<Control, EarlyInput>(
    captureEarlyInput(root).map((input) => [input.control, input]),
  );
  const note = (event: Event) => {
    if (isControl(event.target)) inputs.set(event.target, read(event.target));
  };
  // Capturing, so it's seen even if the page stops the event.
  root.addEventListener('input', note, true);
  root.addEventListener('change', note, true);
  return {
    stop: () => {
      root.removeEventListener('input', note, true);
      root.removeEventListener('change', note, true);
      return [...inputs.values()];
    },
  };
}

/**
 * Puts back whatever the app has since overwritten and tells the app, as if it had just been
 * typed or picked. Controls that still hold their input were handled by the app already.
 */
export function restoreEarlyInput(inputs: readonly EarlyInput[]): void {
  for (const { control, value, checked } of inputs) {
    if (!control.isConnected) continue;
    if (isToggle(control)) {
      if (control.checked === checked) continue;
      control.checked = checked;
    } else {
      if (control.value === value) continue;
      control.value = value;
    }
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

/**
 * A prerendered page can be typed into before the app has started. When the app then takes the
 * page over it writes its own, empty state into the fields. This notes what the fields hold, from
 * the moment the app's code runs until its first page has rendered, and then gives back to the
 * app whatever it overwrote. Clicks made in that time are replayed by Angular itself
 * (`withEventReplay`).
 */
export function keepEarlyInput(): EnvironmentProviders {
  return provideAppInitializer(() => {
    if (!injectIsBrowser()) return;
    const injector = inject(Injector);
    const recording = recordEarlyInput(inject(DOCUMENT));
    const events = inject(Router).events.subscribe((event) => {
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Only the first page is prerendered.
        events.unsubscribe();
        afterNextRender(() => restoreEarlyInput(recording.stop()), { injector });
      }
    });
  });
}
