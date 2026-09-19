// Shared across every popover/dropdown on the page — a counter rather
// than a simple boolean, so if more than one happens to be open at once,
// closing one doesn't prematurely unlock scroll while another is still
// open.
let dropdownScrollLockCount = 0;
export function lockPageScroll() {
  dropdownScrollLockCount++;
  if (dropdownScrollLockCount === 1) {
    // Locking scroll via overflow:hidden would normally make the browser's
    // own scrollbar disappear, and since its width is no longer reserved,
    // the page content shifts sideways to fill the gap — a visible jump.
    // That's handled globally instead, by the scrollbar-gutter:stable rule
    // in index.css, which keeps the gutter's space permanently reserved
    // regardless of scroll-lock state — so nothing needs compensating for
    // here. (Adding padding-right on top of that rule would double-count
    // the gutter and shift content sideways instead of preventing it.)
    document.body.style.overflow = "hidden";
  }
}
export function unlockPageScroll() {
  dropdownScrollLockCount = Math.max(0, dropdownScrollLockCount - 1);
  if (dropdownScrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}
