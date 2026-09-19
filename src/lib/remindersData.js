// Reminder severity — three tiers, independent of category. Market Event
// and Trade reminders get a system-decided default (below); Personal
// reminders have no default, since there's nothing to base one on.
export const REMINDER_SEVERITY = {
  red: { label: "Major", border: "border-rose-500", text: "text-rose-500", bg: "bg-rose-500/10", dot: "#f43f5e" },
  yellow: { label: "Mid", border: "border-amber-400", text: "text-amber-400", bg: "bg-amber-400/10", dot: "#fbbf24" },
  blue: { label: "Minor", border: "border-sky-400", text: "text-sky-400", bg: "bg-sky-400/10", dot: "#38bdf8" },
};

// The reminder category taxonomy — grouped for usability at this scale.
// Grounded in real 2026 structure: RBI's bi-monthly MPC cadence, the
// Fed's 8 FOMC meetings/year plus Beige Book and Minutes, Nifty/Sensex
// semi-annual rebalancing on Mar 31 / Sep 30, and India's standard
// monthly data-release cadence (CPI on the 12th, IIP on the 28th, etc).
// This is the starting structure — Edit Categories can add, remove, or
// re-color any of it; only the severity is overridden per-user (see
// getReminderSeverityDefault below), everything else here is fixed.
export const REMINDER_EVENT_GROUPS = [
  { group: "Central Bank & Monetary Policy", items: [
    ["RBI MPC Policy Decision", "red"], ["RBI MPC Minutes", "yellow"], ["RBI Monetary Policy Report", "yellow"],
    ["US Fed FOMC Rate Decision", "red"], ["US Fed FOMC Minutes", "yellow"], ["US Fed Beige Book", "yellow"],
    ["US Fed Chair Press Conference", "red"], ["US Fed Dot Plot / SEP", "red"], ["Fed Speaker / Speech", "yellow"],
    ["ECB Rate Decision", "yellow"], ["Bank of England Rate Decision", "yellow"], ["Bank of Japan Rate Decision", "yellow"],
    ["PBoC Rate Decision / LPR", "yellow"], ["Jackson Hole Symposium", "yellow"], ["RBI Governor Speech", "yellow"],
  ]},
  { group: "Government & Fiscal", items: [
    ["Union Budget", "red"], ["Economic Survey of India", "yellow"], ["GST Council Meeting", "yellow"],
    ["Union Cabinet — Major Policy Decision", "yellow"], ["Parliament — Budget Session", "yellow"],
    ["Parliament — Monsoon Session", "blue"], ["Parliament — Winter Session", "blue"],
    ["Finance Bill Passage", "yellow"], ["PSU Disinvestment / Stake Sale", "yellow"], ["RBI Dividend to Government", "yellow"],
  ]},
  { group: "Elections & Political", items: [
    ["Lok Sabha General Election", "red"], ["State Assembly Election — Result Day", "yellow"],
    ["By-Election", "blue"], ["No-Confidence Motion", "red"], ["US Presidential Election", "red"],
    ["US Midterm Election", "yellow"], ["State Election — Uttar Pradesh", "yellow"], ["State Election — Maharashtra", "yellow"],
    ["State Election — West Bengal", "yellow"], ["State Election — Tamil Nadu", "yellow"], ["State Election — Bihar", "yellow"],
    ["State Election — Karnataka", "yellow"], ["State Election — Gujarat", "yellow"], ["State Election — Madhya Pradesh", "blue"],
  ]},
  { group: "India Macro Data", items: [
    ["India CPI Inflation", "red"], ["India WPI Inflation", "yellow"], ["India IIP", "yellow"],
    ["India GDP / GVA (Quarterly)", "red"], ["India PMI Manufacturing", "yellow"], ["India PMI Services", "yellow"],
    ["India Core Sector Output", "yellow"], ["India Trade Balance", "yellow"], ["India Forex Reserves", "blue"],
    ["India Fiscal Deficit", "yellow"], ["India Money Supply (M3)", "blue"], ["India Bank Credit/Deposit Growth", "blue"],
    ["India Auto Sales (Monthly)", "blue"], ["India Current Account Deficit", "yellow"],
  ]},
  { group: "Global Macro Data", items: [
    ["US Non-Farm Payrolls (NFP)", "red"], ["US CPI Inflation", "red"], ["US PCE Inflation", "red"],
    ["US PPI", "yellow"], ["US GDP", "yellow"], ["US ISM Manufacturing PMI", "yellow"], ["US ISM Services PMI", "yellow"],
    ["US Retail Sales", "yellow"], ["US Jobless Claims (Weekly)", "blue"], ["US Consumer Confidence", "blue"],
    ["China PMI", "yellow"], ["China GDP", "yellow"], ["China Trade Data", "blue"], ["Eurozone CPI", "blue"],
    ["Eurozone GDP", "blue"], ["Crude Oil Inventory (EIA/API)", "yellow"], ["OPEC+ Meeting", "yellow"],
  ]},
  { group: "Index & Fund Flows", items: [
    ["Nifty/Sensex Semi-Annual Rebalancing", "yellow"], ["Nifty Next 50 Rebalancing", "blue"],
    ["MSCI Index Review (Quarterly)", "yellow"], ["FTSE Index Review (Quarterly)", "blue"],
    ["FII/DII Flow Data", "blue"], ["F&O Ban List Change", "blue"], ["Russell US Index Reconstitution", "blue"],
  ]},
  { group: "Expiry & Derivatives", items: [
    ["NIFTY Weekly Expiry", "yellow"], ["BANKNIFTY Weekly Expiry", "yellow"], ["Monthly Index Expiry", "yellow"],
    ["Monthly Stock F&O Expiry", "yellow"], ["India VIX Expiry-linked Move", "blue"],
  ]},
  { group: "Corporate & Earnings", items: [
    ["TCS Earnings", "yellow"], ["Infosys Earnings", "yellow"], ["Reliance Industries Earnings", "yellow"],
    ["HDFC Bank Earnings", "yellow"], ["ICICI Bank Earnings", "yellow"], ["SBI Earnings", "yellow"],
    ["Bharti Airtel Earnings", "blue"], ["L&T Earnings", "blue"], ["ITC Earnings", "blue"], ["Axis Bank Earnings", "blue"],
    ["Kotak Mahindra Bank Earnings", "blue"], ["Major IPO Listing", "blue"], ["Block/Bulk Deal — Major Holding", "blue"],
    ["AGM / EGM — Major Holding", "blue"],
  ]},
  { group: "Global & Geopolitical Risk", items: [
    ["Sovereign Credit Rating Review", "yellow"], ["Geopolitical Conflict Escalation", "red"],
    ["G20 / G7 Summit", "blue"], ["US Debt Ceiling / Govt Shutdown Risk", "yellow"], ["Major Sanctions Announcement", "yellow"],
  ]},
];

export const REMINDER_TRADE_GROUPS = [
  { group: "Trade", items: [
    ["Position Expiry", "yellow"], ["Review Trade", "blue"], ["Adjustment Due", "blue"],
    ["Roll Decision Due", "blue"], ["Margin Call Alert", "red"], ["Stop-Loss Review", "blue"],
  ]},
];

export const REMINDER_TOTAL_COUNT = REMINDER_EVENT_GROUPS.reduce((s, g) => s + g.items.length, 0)
  + REMINDER_TRADE_GROUPS.reduce((s, g) => s + g.items.length, 0);

// Built-in default severity for a subcategory, before any per-user override
export function reminderBuiltInSeverity(subcategory) {
  for (const g of [...REMINDER_EVENT_GROUPS, ...REMINDER_TRADE_GROUPS]) {
    const hit = g.items.find(([name]) => name === subcategory);
    if (hit) return hit[1];
  }
  return "blue";
}
