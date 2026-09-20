import { Link } from "react-router-dom";
import { StaticPageShell } from "../../components/shared/StaticPageShell.jsx";

function H2({ children }) {
  return <h2 className="text-base font-semibold mt-8 mb-2" style={{ color: "var(--tj-text1)" }}>{children}</h2>;
}

export function PrivacyPolicyPage() {
  return (
    <StaticPageShell title="Privacy Policy">
      <p className="text-xs" style={{ color: "var(--tj-text4)" }}>Last updated: 20 September 2026</p>
      <p>
        Comet Trading Journal is a personal trading journal — this policy explains what data it
        collects, why, and what control you have over it. It's written in plain language on
        purpose; if anything here is unclear, it means the policy needs fixing, not you.
      </p>

      <H2>Information we collect</H2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account information</strong> from Google Sign-In — your name, email address, and profile photo, used to identify your account and greet you by name.</li>
        <li><strong>Journal data you enter yourself</strong> — trades, checklist entries, fund transactions, custom strategies, learning notes, reminders, and any screenshots or files you attach. This is the actual content of the app; none of it is collected passively.</li>
        <li><strong>Local device data</strong> — your PIN and security-question answers (stored only as salted hashes, never in plain text), theme preference, and a small amount of session state, kept in your browser's local storage.</li>
      </ul>
      <p>We don't collect payment details, government IDs, or any data from a brokerage or exchange account — trade data only enters the journal when you type it in.</p>

      <H2>How we use it</H2>
      <p>
        Solely to run the app for you: rendering your dashboard and statistics, saving and
        retrieving your journal entries, and enforcing the PIN lock you set up. Your data is
        never sold, rented, or used for advertising, and it isn't shared with third parties
        beyond the infrastructure providers below.
      </p>

      <H2>Where your data lives</H2>
      <p>
        Journal data is stored in a Supabase-hosted Postgres database and file storage bucket.
        Access is scoped per account (row-level security), so your data is only readable by your
        own signed-in session. Sign-in itself is handled by Google's OAuth service — we never see
        or store your Google password.
      </p>

      <H2>Cookies &amp; local storage</H2>
      <p>
        The app uses browser local storage and session storage to keep you signed in, remember
        your last-viewed page and theme, and enforce the PIN re-lock timer. There are no
        third-party analytics, advertising, or tracking scripts.
      </p>

      <H2>Your data, your control</H2>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Export anytime.</strong> Settings → Clear My Data includes a full backup download of your journal data as a JSON file.</li>
        <li><strong>Clear selectively.</strong> Settings lets you wipe trading data, strategies, learnings, or reminders independently.</li>
        <li><strong>Delete your account.</strong> Requesting deletion starts a 7-day grace period (in case it was a mistake); after that, every record tied to your account is permanently removed.</li>
      </ul>

      <H2>Changes to this policy</H2>
      <p>If this policy changes in a meaningful way, the "last updated" date above will change with it.</p>

      <H2>Contact</H2>
      <p>
        Comet Trading Journal is built and maintained by Ankit Tanwar. Questions about this
        policy can be sent via the email address associated with your account. See also the{" "}
        <Link to="/terms" className="underline">Terms of Service</Link> and{" "}
        <Link to="/disclaimer" className="underline">Risk Disclaimer</Link>.
      </p>
    </StaticPageShell>
  );
}
