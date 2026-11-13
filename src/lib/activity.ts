/** Messages sent on the current page, reported with the page's time spent. Counts only, never text. */
let messages = 0;

export function countMessage(): void {
  messages += 1;
}

export function takeMessages(): number {
  const n = messages;
  messages = 0;
  return n;
}
