import { StaticPageShell } from "../../components/shared/StaticPageShell.jsx";

function H2({ children }) {
  return <h2 className="text-base font-semibold mt-8 mb-2" style={{ color: "var(--tj-text1)" }}>{children}</h2>;
}

export function RiskDisclaimerPage() {
  return (
    <StaticPageShell title="Risk Disclaimer">
      <H2>Trading involves substantial risk</H2>
      <p>
        Trading in equities, futures, and options carries a high level of risk and may not be
        suitable for everyone. Options in particular can result in the loss of your entire
        investment in a short period of time, and strategies involving naked or undefined-risk
        positions can produce losses larger than your initial capital.
      </p>

      <H2>This is a record-keeping tool, not advice</H2>
      <p>
        Comet Trading Journal is a personal discipline and record-keeping tool. Its checklist
        prompts, risk calculator, Greeks guidance, and statistics (win rate, expectancy, profit
        factor, and similar figures) are derived entirely from data you enter, and are provided
        for your own reference only. None of it constitutes a recommendation, solicitation, or
        offer to buy or sell any security or derivative, and none of it should be treated as
        financial, investment, tax, or legal advice.
      </p>

      <H2>Past performance</H2>
      <p>Statistics shown in the app reflect your own historical trades. Past performance is not indicative of, and is no guarantee of, future results.</p>

      <H2>No advisory relationship</H2>
      <p>
        The developer of Comet Trading Journal is not a SEBI-registered investment advisor,
        broker, or research analyst, and using the app does not create an advisory or
        broker-client relationship. Before trading, please consult a SEBI-registered investment
        advisor who can assess your specific financial situation.
      </p>

      <H2>Your responsibility</H2>
      <p>
        Every trading decision you make — and its outcome — is entirely your own responsibility.
        The developer assumes no liability for any losses or damages arising from trades made or
        decisions taken with the help of this app.
      </p>
    </StaticPageShell>
  );
}
