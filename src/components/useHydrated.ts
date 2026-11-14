"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False in the server HTML and during hydration, true after. Submit buttons stay disabled
 * until then: a click that lands before React is ready would send the form the plain HTML
 * way and just reload the page.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
