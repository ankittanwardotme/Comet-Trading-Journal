/* ============== PIN hashing (Web Crypto SHA-256 + random salt) ==============
   The PIN is never stored or transmitted in plain text — only a salted hash. */
export function bufToHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function hashPin(pin, saltHex) {
  const enc = new TextEncoder();
  const data = enc.encode(saltHex + ":" + pin);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bufToHex(digest);
}
export async function createPinRecord(pin) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = bufToHex(saltBytes);
  const hash = await hashPin(pin, salt);
  return { salt, hash };
}
export async function verifyPin(pin, record) {
  if (!record || !record.salt || !record.hash) return false;
  const hash = await hashPin(pin, record.salt);
  return hash === record.hash;
}

/* ============== Security questions (PIN recovery) ==============
   Answers are hashed exactly like the PIN itself — never stored in plain
   text. Answers are normalized before hashing/comparing so trivial
   differences (case, spacing, punctuation) don't cause false mismatches. */
export const SECURITY_QUESTIONS = [
  { id: "q1", text: "What was the name of your first pet?" },
  { id: "q2", text: "What city were you born in?" },
  { id: "q3", text: "What was the make and model of your first car?" },
  { id: "q4", text: "What is your mother's maiden name?" },
  { id: "q5", text: "What was the name of your elementary school?" },
  { id: "q6", text: "What was your childhood nickname?" },
  { id: "q7", text: "What is the name of your best childhood friend?" },
  { id: "q8", text: "In what city did your parents meet?" },
  { id: "q9", text: "What was the name of your first employer?" },
  { id: "q10", text: "What street did you grow up on?" },
  { id: "q11", text: "What is your favorite book?" },
  { id: "q12", text: "What was the first concert you attended?" },
  { id: "q13", text: "What is your favorite movie?" },
  { id: "q14", text: "What was the name of your first stuffed animal or toy?" },
  { id: "q15", text: "What is your father's middle name?" },
  { id: "q16", text: "What was your favorite subject in school?" },
  { id: "q17", text: "What is the name of a memorable place you've traveled to?" },
  { id: "q18", text: "What was the name of your first boss?" },
  { id: "q19", text: "What is your favorite food?" },
  { id: "q20", text: "What was the brand of your first mobile phone?" },
];
export function normalizeAnswer(raw) {
  return (raw || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "");
}
export function pickRandomQuestions(count) {
  const shuffled = [...SECURITY_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
