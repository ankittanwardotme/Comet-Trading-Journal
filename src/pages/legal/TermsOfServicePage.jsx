import { Link } from "react-router-dom";
import { StaticPageShell } from "../../components/shared/StaticPageShell.jsx";

function H2({ children }) {
  return <h2 className="text-base font-semibold mt-8 mb-2" style={{ color: "var(--tj-text1)" }}>{children}</h2>;
}

export function TermsOfServicePage() {
  return (
    <StaticPageShell title="Terms of Service">
      <p>
        By signing in and using Comet Trading Journal, you agree to these terms. This is a
        personal project, not a commercial product with a support contract or an uptime
        guarantee — read on for what that means in practice.
      </p>

      <H2>What this is</H2>
      <p>
        Comet Trading Journal is a personal record-keeping and pre-trade discipline tool: a
        checklist, a trade setup calculator, a trading history, and a notes/reminders system. It
        does not connect to any broker or exchange, does not place or execute trades, and does
        not provide financial, investment, or tax advice of any kind.
      </p>

      <H2>Not financial advice</H2>
      <p>
        Nothing in the app — including risk calculations, statistics, or Greeks guidance — is a
        recommendation to buy, sell, or hold any security or derivative. See the{" "}
        <Link to="/disclaimer" className="underline">Risk Disclaimer</Link> for more, and consult
        a SEBI-registered investment advisor before making trading decisions.
      </p>

      <H2>Your account</H2>
      <ul className="list-disc pl-5 space-y-1">
        <li>You sign in with your own Google account and are responsible for keeping it secure.</li>
        <li>You're responsible for your PIN and security-question answers, and for whatever data you choose to enter.</li>
        <li>The journal data you enter is yours — the app is simply where you've chosen to keep it.</li>
      </ul>

      <H2>Acceptable use</H2>
      <p>Don't use the app for anything unlawful, and don't attempt to access another account, bypass its security, or disrupt the service.</p>

      <H2>Availability &amp; changes</H2>
      <p>
        As a personal project, features, the underlying infrastructure, or the service itself may
        change, be paused, or be discontinued without advance notice. Where practical, you'll be
        able to export your data first (see the Privacy Policy for how).
      </p>

      <H2>No warranty, limited liability</H2>
      <p>
        The app is provided "as is," without warranty of any kind. To the fullest extent
        permitted by law, the developer isn't liable for any trading losses, missed trades, data
        loss, or other damages arising from your use of the app — you remain solely responsible
        for your own trading decisions.
      </p>

      <H2>Termination</H2>
      <p>You can stop using the app and delete your account at any time from Settings. Account deletion follows a 7-day grace period, described in the Privacy Policy.</p>

      <H2>Governing law</H2>
      <p>These terms are governed by the laws of India.</p>

      <H2>Changes to these terms</H2>
      <p>If these terms change in a meaningful way, the "last updated" date above will change with it.</p>
    </StaticPageShell>
  );
}
