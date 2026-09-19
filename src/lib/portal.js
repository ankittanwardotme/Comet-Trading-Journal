// Every createPortal() in this app must target the themed `.tj-app`
// wrapper, not document.body — portaling straight to document.body
// renders content outside the themed subtree, silently falling back to
// unthemed defaults regardless of the user's selected theme. This exact
// bug has been introduced and fixed twice in this project's history
// (once for the OAuth consent screen, once for trade screenshot
// attachments) — always use this helper instead of writing
// `document.querySelector(".tj-app") || document.body` by hand.
export function getPortalTarget() {
  return document.querySelector(".tj-app") || document.body;
}
