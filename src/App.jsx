import { Routes, Route } from "react-router-dom";
import AuthGate from "./pages/auth/AuthGate.jsx";
import { AboutPage } from "./pages/about/AboutPage.jsx";
import { PrivacyPolicyPage } from "./pages/legal/PrivacyPolicyPage.jsx";
import { TermsOfServicePage } from "./pages/legal/TermsOfServicePage.jsx";
import { RiskDisclaimerPage } from "./pages/legal/RiskDisclaimerPage.jsx";

// About/legal pages are deliberately public — reachable whether or not
// you're signed in — so they're matched here, above AuthGate, rather than
// as routes inside AppShell (which only ever mounts post-auth). Everything
// else still goes through AuthGate's own session/PIN gate untouched.
export default function App() {
  return (
    <Routes>
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/disclaimer" element={<RiskDisclaimerPage />} />
      <Route path="/*" element={<AuthGate />} />
    </Routes>
  );
}
