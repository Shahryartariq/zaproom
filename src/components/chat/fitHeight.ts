/**
 * Grow a textarea with its text, up to its CSS max-height. `scrollHeight` leaves out
 * the border, so add it back; otherwise the box ends up a few pixels short and shows
 * a scrollbar (Windows draws arrows for it).
 */
export function fitHeight(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  if (!el.value) return;
  const border = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + border}px`;
}
