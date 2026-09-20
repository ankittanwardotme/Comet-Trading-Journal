import { Link } from "react-router-dom";
import { StaticPageShell } from "../../components/shared/StaticPageShell.jsx";

export function AboutPage() {
  return (
    <StaticPageShell title="About Comet Trading Journal">
      <p>
        Comet Trading Journal is a pre-trade discipline layer for options sellers and buyers —
        a place to slow down before a trade, run through a checklist, size the position against
        a real risk budget, and keep an honest record of what actually happened afterward.
      </p>
      <p>It's built around a few ideas:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Checklist before capital.</strong> A pre-trade checklist tuned to your strategy's risk profile, so the same questions get asked every time — not just on the trades that go wrong.</li>
        <li><strong>Setup with a risk calculator.</strong> Build the strategy's legs, see the net premium and payoff, and size the trade against a target risk percentage of capital, not a gut feeling.</li>
        <li><strong>A real trading history.</strong> Every trade, its P&L, its charges, and its notes, kept in one place — filterable, exportable, and tied back to your actual capital and fund transactions.</li>
        <li><strong>Learnings that link back to trades.</strong> Notes and post-mortems that reference the specific trade they're about, instead of living in a separate notebook nobody reopens.</li>
        <li><strong>Reminders and a holiday calendar</strong>, so expiry dates, macro events, and your own notes-to-self show up when they matter.</li>
      </ul>
      <p>
        It's a personal project, built and maintained by Ankit Tanwar. It isn't affiliated with
        any exchange, broker, or financial institution, and it doesn't execute trades or provide
        investment advice — see the <Link to="/disclaimer" className="underline">Risk Disclaimer</Link> for
        more on that.
      </p>
    </StaticPageShell>
  );
}
