import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  IconActivity, IconAdjustmentsHorizontal, IconAlertTriangle, IconArrowLeft, IconArrowsExchange, IconBell, IconBellRinging, IconBook, IconBooks,
  IconBulb, IconCalculator, IconCalendar, IconCamera, IconChartBar, IconCheck, IconChecklist,
  IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp, IconChevronsDown, IconChevronsUp, IconClock, IconClockHour4, IconCopy, IconCrosshair, IconCurrencyRupee,
  IconDeviceDesktop, IconDeviceFloppy, IconDotsVertical, IconDownload, IconExternalLink, IconFilePlus, IconFileText,
  IconFlag, IconFolder, IconFolderPlus, IconFolderSymlink, IconGitBranch, IconLayoutDashboard, IconLayoutGrid, IconLink, IconList, IconLoader2, IconLock,
  IconMoodSmile, IconMoon, IconPalette, IconPencil, IconPercentage, IconPlus, IconPointFilled, IconRotate,
  IconSearch, IconSettings, IconSettings2, IconShield, IconStack2, IconStar, IconStarFilled, IconSun,
  IconTag, IconTarget, IconTerminal2, IconTrash, IconTrendingDown, IconTrendingUp, IconTrophy,
  IconUserCircle, IconUserOff, IconWallet, IconX,
} from "@tabler/icons-react";
import logo from "./assets/logo.png";
import { playAlarmChime, playErrorBeep } from "./lib/audio.js";
import { parseNoteBlocks, blockInlineText, blockNoteSnippet, blockNoteToPlainText, formatNoteLinks } from "./lib/noteBlocks.js";
import {
  supabase, dbStorage, dbTable, currentUserId, checkForHolidayLogUpdates, ADMIN_EMAIL, isAdminSession, DEFAULT_HOLIDAYS_2026,
  SHARED_HOLIDAYS_KEY, SHARED_HOLIDAY_LOG_KEY,
  NOTE_FILES_BUCKET, uploadNoteFile, readFileAsDataUrl, extractStoragePathsFromContent, deleteNoteStorageFiles, deleteAllNoteStorageFilesForUser,
  TRADE_IMAGES_BUCKET, uploadTradeFile, deleteTradeScreenshotFiles, deleteAllTradeStorageFilesForUser, deleteAllUserData,
} from "./lib/supabaseClient.js";
import { notify, subscribeToNotifications, deleteWithUndo, clearPersistedNotifications } from "./lib/notifications.js";
import { getPortalTarget } from "./lib/portal.js";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "./lib/theme.js";
import { useThemeSettings } from "./hooks/useThemeSettings.js";
import { FONT_DISPLAY, FONT_MONO, fmt2dp, fmtINR, fmtINRsigned, fmtHour12, formatRelativeTime } from "./lib/format.js";
import {
  tradeRowToJs, tradeJsToRow, reminderRowToJs, reminderJsToRow, fundTxRowToJs, fundTxJsToRow,
  noteRowToJs, noteJsToRow, folderRowToJs, folderJsToRow, historyRowToJs, historyJsToRow,
} from "./lib/rowMappers.js";
import { bufToHex, hashPin, createPinRecord, verifyPin, SECURITY_QUESTIONS, normalizeAnswer, pickRandomQuestions } from "./lib/security.js";
import { REMINDER_SEVERITY, REMINDER_EVENT_GROUPS, REMINDER_TRADE_GROUPS, REMINDER_TOTAL_COUNT, reminderBuiltInSeverity } from "./lib/remindersData.js";
import {
  parseReminderTime, currentTimeString, reminderCombinedEpoch, reminderRelativeAgo, reminderDayLabel, reminderTimeDisplay, reminderTimeToHour24,
} from "./lib/reminderTime.js";
import {
  DEFAULT_STRATEGIES, STRATEGY_CATEGORIES, PROFILE_OPTIONS, inferStrategyProfile, describeInferredProfile, LEG_TEMPLATES,
  slugify, makeUniqueId, DEFAULT_SECTION_DEFS, CHECKLIST_PROFILE_OPTIONS, freshChecklistItemId, CUSTOM_SECTION_COLORS, buildEffectiveSections,
} from "./lib/checklistLogic.js";
import {
  bandIndexForDays, GREEKS_PROFILES, GREEKS_POLARITY, POLARITY_DISPLAY, getEffectiveGreeksProfile, getGreeksBand, COLOR_CLASSES,
} from "./lib/greeks.js";
import { computeHomeStats, heatCellStyle, buildMonthColumns } from "./lib/homeStats.js";
import {
  createPdfDoc, logCategoryName, pastTradeTitle, buildLegChangeEvents, buildLogDetailPDF, buildLogsDetailPDF,
  buildMarkdownFromHistory, compareTradesNewestFirst, pnlGroupsByMonth, getTradeStatus, buildPnlMarkdown, buildPnlDetailPDF,
  freshLegId, legsFromTemplate, freshPnlId, freshNoteId, freshReminderId, freshFolderId, renderBlockNoteBlocksToPDF, buildNotePDF,
} from "./lib/exportEngine.js";
import { Tooltip } from "./components/shared/Tooltip.jsx";
import { InfoIcon } from "./components/shared/InfoIcon.jsx";
import { TabBar } from "./components/shared/TabBar.jsx";
import { CollapsibleSection, CollapsibleRegion } from "./components/shared/CollapsibleSection.jsx";
import { AvatarSVG, DEFAULT_AVATAR } from "./components/shared/AvatarSVG.jsx";
import { PinDigitInput } from "./components/shared/PinDigitInput.jsx";
import { MoodEmoji } from "./components/shared/MoodEmoji.jsx";
import { MoodPickerButton } from "./components/shared/MoodPickerButton.jsx";
import { CalendarPicker, buildCalendarWeeks, CALENDAR_DOW_LABELS, CALENDAR_EST_HEIGHT } from "./components/shared/CalendarPicker.jsx";
import { MonthPicker } from "./components/shared/MonthPicker.jsx";
import { YearPicker } from "./components/shared/YearPicker.jsx";
import { ExpiryPicker } from "./components/shared/ExpiryPicker.jsx";
import { lockPageScroll, unlockPageScroll } from "./lib/scrollLock.js";
import { CompactFilterButton } from "./components/shared/CompactFilterButton.jsx";
import { DropdownFilterButton } from "./components/shared/DropdownFilterButton.jsx";
import { ThemedSelect } from "./components/shared/ThemedSelect.jsx";
import { ToastStack } from "./components/shared/ToastStack.jsx";
import { NotificationBell } from "./components/shared/NotificationBell.jsx";
import { TemplatePickerModal } from "./components/shared/TemplatePickerModal.jsx";
import { ExpandableNoteField } from "./components/shared/ExpandableNoteField.jsx";
import { TradeScreenshotsButton } from "./components/shared/TradeScreenshotsButton.jsx";
import { StrategyPicker } from "./components/shared/StrategyPicker.jsx";
import { LegsCard } from "./components/shared/LegsCard.jsx";
import { LegsTimelineModal } from "./components/shared/LegsTimelineModal.jsx";
import { DataInterpretationSection } from "./pages/checklist/components/DataInterpretationSection.jsx";
import { ChecklistTabPanel } from "./pages/checklist/components/ChecklistTabPanel.jsx";
import { ChecklistManagerTab } from "./pages/checklist/components/ChecklistManagerTab.jsx";
import { DaysToExpiryWidget } from "./pages/tradeSetup/components/DaysToExpiryWidget.jsx";
import { CustomStrategyDialog } from "./pages/tradeSetup/components/CustomStrategyDialog.jsx";
import { RemindersPage } from "./pages/reminders/RemindersPage.jsx";
import { AddReminderPage } from "./pages/reminders/AddReminderPage.jsx";
import { RescheduleReminderPage } from "./pages/reminders/RescheduleReminderPage.jsx";
import { RemindersSettingsPage } from "./pages/reminders/RemindersSettingsPage.jsx";
import { ReminderWindowSettingsPage } from "./pages/reminders/ReminderWindowSettingsPage.jsx";
import { EditCategoriesPage } from "./pages/reminders/EditCategoriesPage.jsx";
import { ReminderAlarmPopup } from "./pages/reminders/components/ReminderAlarmPopup.jsx";
import { PnlTab } from "./pages/tradeHistory/PnlTab.jsx";
import { ManageFundsDialog } from "./pages/tradeHistory/components/ManageFundsDialog.jsx";
import { MyLearningsTab } from "./pages/learnings/MyLearningsTab.jsx";
import { DocsPage } from "./pages/docs/DocsPage.jsx";
import { HolidayCalendarPage } from "./pages/holidays/HolidayCalendarPage.jsx";
import { SettingsPage } from "./pages/settings/SettingsPage.jsx";
import { HomePage } from "./pages/home/HomePage.jsx";
import { MOOD_OPTIONS, moodMeta, TWEMOJI_CDN } from "./lib/moodOptions.js";
import { DATA_ROWS, RADIO_OPTIONS, dataReadLabel, getVerdict } from "./lib/marketRead.js";
import {
  MONTH_NAMES, MONTH_ABBR, EXPIRY_DOW_CUTOVER, localISODate,
  isWeekendISO, nearestLegExpiry, contractDateCode, isLegComplete, drawPdfMasthead, formatLegLine, pad2,
  fmtDateDMY, fmtDateTimeDMY, fmtTimeOnly, isoToDMY, isoToWordDate, isoToMonDDYYYY, isoToShortDate, daysUntil,
  shiftForHoliday, nextWeekdayOnOrAfter, lastWeekdayOfMonth, expiryDayOfWeekFor, generateExpiryOptions,
  monthKeyOf, monthLabel, legsToParts, computeNetPremiumSigned, computeStrategyPayoff, escHtml, computeLegPL, computeClosedLegsPL, classifyLegSymbol,
  isStrategyHedgeEligible, legsMatchForGrouping, findMatchingActiveLeg, groupLegsByPosition, closeLotsFIFO, detectStrategyShape, resolveDetectedStrategyLabel,
} from "./lib/dateUtils.js";



/* ============== Small components ============== */

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "#09090b" }}>
      <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-100" style={FONT_DISPLAY}>
        <IconChecklist size={22} className="tj-primary-text" />
        Comet Trading Journal
      </div>
      <div className="w-40 h-1 rounded-full bg-zinc-800 overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 w-1/3 tj-primary-bg rounded-full" style={{ animation: "tj-loading-sweep 1.1s ease-in-out infinite" }}></div>
      </div>
      <p className="text-xs text-zinc-600" style={FONT_MONO}>Loading your journal...</p>
    </div>
  );
}

/* ============== Main ============== */
function PreTradeChecklist({ session, pinRecord, onPinChanged, securityQuestions, onSecurityQuestionsChanged, deletionCancelledNotice, onDismissDeletionNotice, pinUnlocked }) {
  const [mode, setMode] = useState("trade");
  const VALID_TOP_TABS = ["home", "checklist", "setup", "pnl", "log", "learn", "holidays", "profile", "docs"];
  const [topTab, setTopTab] = useState(() => {
    try {
      const stored = localStorage.getItem("tj-last-tab");
      return VALID_TOP_TABS.includes(stored) ? stored : "home";
    } catch (e) { return "home"; }
  });
  useEffect(() => {
    try { localStorage.setItem("tj-last-tab", topTab); } catch (e) { /* best effort */ }
  }, [topTab]);

  // Browsers restore the previous scroll offset on reload by default, which
  // is exactly what was carrying a scrolled-down position across a fresh
  // login. Taking manual control means every load starts at the top unless
  // this component explicitly says otherwise. Checked on every animation
  // frame (not just a few fixed checkpoints) for a generous window after
  // mount, since dashboard data can take longer to finish loading than any
  // fixed set of checkpoints would anticipate — this reacts to however long
  // it actually takes instead of guessing at specific millisecond offsets.
  // Re-triggered when the PIN gate actually unlocks (not just at this
  // component's initial mount, which happens earlier while still hidden
  // behind the PIN overlay) — that's the moment the dashboard genuinely
  // becomes visible, and confirmed via testing to be when a stray scroll
  // offset otherwise sneaks in.
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    let active = true;
    const startTime = Date.now();
    const WATCH_MS = 8000;

    // The moment there's any sign of the user actually trying to scroll,
    // back off immediately and never touch scroll position again for this
    // watch cycle — otherwise the auto-correction (which runs every frame)
    // undoes a real scroll attempt within ~16ms, making the page feel
    // frozen even though the drift-correction itself is only meant to
    // catch layout shifts the user had no part in.
    const stopOnUserIntent = () => { active = false; };
    const scrollKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);
    const onKeyDown = (e) => { if (scrollKeys.has(e.key)) stopOnUserIntent(); };
    window.addEventListener("wheel", stopOnUserIntent, { passive: true });
    window.addEventListener("touchstart", stopOnUserIntent, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    function frameLoop() {
      if (!active) return;
      const elapsed = Date.now() - startTime;
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (y !== 0) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
      if (elapsed < WATCH_MS) requestAnimationFrame(frameLoop);
    }
    requestAnimationFrame(frameLoop);
    return () => {
      active = false;
      window.removeEventListener("wheel", stopOnUserIntent);
      window.removeEventListener("touchstart", stopOnUserIntent);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pinUnlocked]);

  // Switching tabs is a client-side state change, not a real page
  // navigation — the browser has no built-in reason to reset scroll
  // position the way it would for an actual new page, so a tab that's
  // never been scrolled inherits whatever offset the previous tab was left
  // at. Every tab switch starts fresh at the top instead.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [topTab]);

  // Navbar hides on scroll down, reappears on any scroll up (even a tiny
  // amount) — the small threshold on the "down" direction avoids it
  // flickering away on sub-pixel scroll jitter, but "up" reacts immediately
  // so the nav is never more than a scroll-tick away when the user wants it.
  const [navHidden, setNavHidden] = useState(false);
  const [navHeight, setNavHeight] = useState(168);
  const navResizeObserverRef = useRef(null);

  // The My Learnings tab needs to know the nav's real rendered height to
  // fill exactly the remaining viewport space. This MUST be a callback
  // ref, not a plain useRef + useEffect(..., []) — the nav is gated
  // behind `!appDataReady ? <AppLoadingScreen/> : (...)`, so on first
  // mount (while data is still loading) the nav div doesn't exist yet.
  // A plain ref/effect combo fires once, sees a null ref, and never
  // retries once the nav actually appears — which is exactly why the
  // previous version stayed stuck at the 168 fallback forever, as seen
  // directly in the rendered `calc(-168px + 100vh)` output. A callback
  // ref is invoked by React precisely when the node attaches (or
  // detaches), no matter when that happens in a conditional tree.
  const navRef = useCallback((el) => {
    if (navResizeObserverRef.current) {
      navResizeObserverRef.current.disconnect();
      navResizeObserverRef.current = null;
    }
    if (!el) return;
    const update = () => setNavHeight(el.offsetHeight || 168);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    navResizeObserverRef.current = ro;
  }, []);
  const lastScrollYRef = useRef(0);
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollYRef.current;
      if (y <= 0) {
        setNavHidden(false);
      } else if (delta > 4) {
        setNavHidden(true);
      } else if (delta < 0) {
        setNavHidden(false);
      }
      lastScrollYRef.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [customStrategies, setCustomStrategies] = useState([]);
  const [checklistOverrides, setChecklistOverrides] = useState({ itemOverrides: {}, deletedItemIds: [], customItems: {}, customSections: [], sectionTitleOverrides: {} });
  const [checklistOverridesLoading, setChecklistOverridesLoading] = useState(true);
  const [strategyType, setStrategyType] = useState("");
  const [strategyCategory, setStrategyCategory] = useState(null);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [editingStratId, setEditingStratId] = useState(null);
  const [showManageStrategies, setShowManageStrategies] = useState(false);
  const [pendingDeleteStratId, setPendingDeleteStratId] = useState(null);
  const [underlying, setUnderlying] = useState("");
  const [legs, setLegs] = useState([]);
  const [checked, setChecked] = useState({});
  // Trade Day / No-Trade Day toggle transition behavior: when the user is
  // already on Market Read (the tab shared by both modes), only the
  // progress-bar-plus-tab-bar region needs to collapse/expand — Market
  // Read itself never re-animates since it's already visible either way.
  // When on a different tab, No-Trade Day forces the view over to Market
  // Read instead (since that's all it shows), so that transition uses a
  // horizontal slide-in for the incoming content and skips animating the
  // now-irrelevant collapse of the tab bar entirely.
  const [region2Animated, setRegion2Animated] = useState(true);
  const [specialSlideActive, setSpecialSlideActive] = useState(false);
  const [capital, setCapital] = useState("");
  const [plannedLoss, setPlannedLoss] = useState("");
  const [customRiskPct, setCustomRiskPct] = useState("");
  const [targetRiskPct, setTargetRiskPct] = useState(2);
  const [targetRiskLoading, setTargetRiskLoading] = useState(true);
  const [editingTargetRisk, setEditingTargetRisk] = useState(false);
  const [targetRiskDraft, setTargetRiskDraft] = useState("");
  const [notes, setNotes] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [entryMood, setEntryMood] = useState(null);
  const [entryMoodNote, setEntryMoodNote] = useState("");
  const [entryMoodNoteOpen, setEntryMoodNoteOpen] = useState(false);
  const [entryMoodNoteDraft, setEntryMoodNoteDraft] = useState("");
  const expiryDate = useMemo(() => nearestLegExpiry(legs), [legs]);
  const [dataReads, setDataReads] = useState({});
  const [activeTab, setActiveTab] = useState("data");

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [incompleteChecklistDialogOpen, setIncompleteChecklistDialogOpen] = useState(false);
  const [checklistManagerOpen, setChecklistManagerOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [moodFilterPoint, setMoodFilterPoint] = useState(null); // null | "entry" | "exit"
  const [moodFilterMood, setMoodFilterMood] = useState(null); // null (Any) | mood id
  const [moodFilterRefine, setMoodFilterRefine] = useState(null); // null (Any) | "same" | "changed"
  const [pendingDeleteTs, setPendingDeleteTs] = useState(null);
  const [entryDownloadFor, setEntryDownloadFor] = useState(null);
  const [logRangeCustomOpen, setLogRangeCustomOpen] = useState(false);

  const [pnlEntries, setPnlEntries] = useState([]);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [monthlyCharges, setMonthlyCharges] = useState({});
  const [monthlyChargesLoading, setMonthlyChargesLoading] = useState(true);
  const [capitalBase, setCapitalBase] = useState(0);
  const [capitalBaseLoading, setCapitalBaseLoading] = useState(true);
  const [fundTransactions, setFundTransactions] = useState([]);
  const [fundTransactionsLoading, setFundTransactionsLoading] = useState(true);
  const [manageFundsDialogOpen, setManageFundsDialogOpen] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [learningNotes, setLearningNotes] = useState([]);
  const noteTemplates = useMemo(() => learningNotes.filter((n) => n.isTemplate), [learningNotes]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [reminderSeverityOverrides, setReminderSeverityOverrides] = useState({});
  const [reminderHiddenSubcategories, setReminderHiddenSubcategories] = useState([]);
  const [reminderCustomSubcategories, setReminderCustomSubcategories] = useState([]); // [{ group, name, severity }]
  const [reminderListWindowDays, setReminderListWindowDays] = useState(14);
  const [noteFolders, setNoteFolders] = useState([]);
  const notesByTradeId = useMemo(() => {
    const map = {};
    learningNotes.forEach((n) => {
      if (!n.linkedTradeId) return;
      (map[n.linkedTradeId] = map[n.linkedTradeId] || []).push(n);
    });
    return map;
  }, [learningNotes]);
  const [pendingOpenNoteId, setPendingOpenNoteId] = useState(null);
  const openNoteFromTrade = (noteId) => {
    setTopTab("learn");
    setPendingOpenNoteId(noteId);
  };
  const [pendingRevealTradeId, setPendingRevealTradeId] = useState(null);
  const openTradeFromReminder = (tradeId) => {
    setTopTab("pnl");
    setPendingRevealTradeId(tradeId);
  };
  const [reminderPrefill, setReminderPrefill] = useState(null);
  const createReminderAt = (date, time) => {
    setReminderPrefill({ date, time: time || null });
    setTopTab("addReminder");
  };
  const [reminderAlarmDismissed, setReminderAlarmDismissed] = useState({}); // { [id]: dismissedForEpochMs }
  const [reminderAlarmDismissedLoaded, setReminderAlarmDismissedLoaded] = useState(false);
  const [dueAlarms, setDueAlarms] = useState([]);
  const [reschedulingReminder, setReschedulingReminder] = useState(null);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({ name: "", nickname: "", email: "", avatarType: null, avatarValue: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [homePrefsLoading, setHomePrefsLoading] = useState(true);
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => localISODate(Date.now()).slice(0, 7));
  const [pnlPendingDeleteId, setPnlPendingDeleteId] = useState(null);
  const [deletingHistoryTs, setDeletingHistoryTs] = useState(null);
  const [deletingPnlId, setDeletingPnlId] = useState(null);
  const [addTradeDialogOpen, setAddTradeDialogOpen] = useState(false);
  const [addTradeDialogClosing, setAddTradeDialogClosing] = useState(false);
  const [addTradeDate, setAddTradeDate] = useState(() => localISODate(Date.now()));
  const [addTradeAffectsCapital, setAddTradeAffectsCapital] = useState(null);
  const [addTradeMoodStepTs, setAddTradeMoodStepTs] = useState(null); // non-null once the trade's saved, for a today-dated trade only — holds the log entry's ts so a picked mood can be saved onto it
  const [addTradeSelectedMood, setAddTradeSelectedMood] = useState(null);
  const [newTradeIdToEdit, setNewTradeIdToEdit] = useState(null);
  const [pnlExportScope, setPnlExportScope] = useState("month");
  const [pnlExportMonth, setPnlExportMonth] = useState(() => localISODate(Date.now()).slice(0, 7));
  const [pnlExportYear, setPnlExportYear] = useState(() => String(new Date().getFullYear()));
  const [pnlExportRangeFrom, setPnlExportRangeFrom] = useState("");
  const [pnlExportRangeTo, setPnlExportRangeTo] = useState("");
  const { themeId, setThemeId, colorMode, setColorMode, themeReady } = useThemeSettings();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuCoords, setAvatarMenuCoords] = useState(null);
  const avatarBtnRef = useRef(null);
  const [previousTopTab, setPreviousTopTab] = useState("setup");
  const [historyPage, setHistoryPage] = useState(1);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadDialogClosing, setDownloadDialogClosing] = useState(false);
  const [downloadTypes, setDownloadTypes] = useState({ observation: true, trade: true, funds_added: true, funds_withdrawn: true });

  const allStrategies = useMemo(() => [...DEFAULT_STRATEGIES, ...customStrategies], [customStrategies]);
  const strategiesInCategory = useMemo(
    () => allStrategies.filter((s) => (s.category || "other") === strategyCategory),
    [allStrategies, strategyCategory]
  );
  const strategyLabelLookup = (id) => { const s = allStrategies.find((x) => x.id === id); return s ? s.label : (id || "Trade"); };
  const currentStrategy = allStrategies.find((s) => s.id === strategyType) || null;
  const profile = currentStrategy ? currentStrategy.profile : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await dbTable.selectAll("checklist_history", "ts");
        if (!cancelled) setHistory(rows.map(historyRowToJs));
      } catch (err) { if (!cancelled) setHistory([]); }
      finally { if (!cancelled) setHistoryLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("custom-strategies");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : []; setCustomStrategies(Array.isArray(parsed) ? parsed : []); }
      } catch (err) { /* no custom strategies yet */ }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("trades", "entry_date");
        if (!cancelled) setPnlEntries(rows.map(tradeRowToJs));
      } catch (err) { if (!cancelled) setPnlEntries([]); }
      finally { if (!cancelled) setPnlLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("pnl-monthly-charges");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : {}; setMonthlyCharges(parsed && typeof parsed === "object" ? parsed : {}); }
      } catch (err) { if (!cancelled) setMonthlyCharges({}); }
      finally { if (!cancelled) setMonthlyChargesLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("target-risk-pct");
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (typeof parsed === "number" && !Number.isNaN(parsed) && parsed > 0) setTargetRiskPct(parsed);
        }
      } catch (err) { /* default target stays */ }
      finally { if (!cancelled) setTargetRiskLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("checklist-config");
        if (!cancelled) {
          const parsed = res && res.value ? JSON.parse(res.value) : null;
          if (parsed && typeof parsed === "object") {
            setChecklistOverrides({
              itemOverrides: parsed.itemOverrides || {},
              deletedItemIds: parsed.deletedItemIds || [],
              customItems: parsed.customItems || {},
              customSections: parsed.customSections || [],
              sectionTitleOverrides: parsed.sectionTitleOverrides || {},
            });
          }
        }
      } catch (err) { /* defaults stay */ }
      finally { if (!cancelled) setChecklistOverridesLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("capital-base");
        if (!cancelled) { const parsed = res && res.value ? JSON.parse(res.value) : 0; setCapitalBase(typeof parsed === "number" && !Number.isNaN(parsed) ? parsed : 0); }
      } catch (err) { if (!cancelled) setCapitalBase(0); }
      finally { if (!cancelled) setCapitalBaseLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("fund_transactions", "date");
        if (!cancelled) setFundTransactions(rows.map(fundTxRowToJs));
      } catch (err) { if (!cancelled) setFundTransactions([]); }
      finally { if (!cancelled) setFundTransactionsLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("notes", "updated_at");
        if (!cancelled) setLearningNotes(rows.map(noteRowToJs));
      } catch (err) { if (!cancelled) setLearningNotes([]); }
      finally { if (!cancelled) setNotesLoading(false); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("reminders", "reminder_date");
        if (!cancelled) setReminders(rows.map(reminderRowToJs));
      } catch (err) { if (!cancelled) setReminders([]); }
      finally { if (!cancelled) setRemindersLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-severity-overrides");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderSeverityOverrides(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderSeverityOverrides({}); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-hidden-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderHiddenSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderHiddenSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-custom-subcategories");
        const parsed = res && res.value ? JSON.parse(res.value) : [];
        if (!cancelled) setReminderCustomSubcategories(Array.isArray(parsed) ? parsed : []);
      } catch (err) { if (!cancelled) setReminderCustomSubcategories([]); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-list-window-days");
        const parsed = res && res.value ? parseInt(res.value, 10) : 14;
        if (!cancelled) setReminderListWindowDays(Number.isFinite(parsed) ? parsed : 14);
      } catch (err) { if (!cancelled) setReminderListWindowDays(14); }
    })();
    (async () => {
      try {
        const res = await dbStorage.get("reminder-alarm-dismissed");
        const parsed = res && res.value ? JSON.parse(res.value) : {};
        if (!cancelled) setReminderAlarmDismissed(parsed && typeof parsed === "object" ? parsed : {});
      } catch (err) { if (!cancelled) setReminderAlarmDismissed({}); }
      finally { if (!cancelled) setReminderAlarmDismissedLoaded(true); }
    })();
    (async () => {
      try {
        const rows = await dbTable.selectAll("note_folders", "created_at");
        if (!cancelled) setNoteFolders(rows.map(folderRowToJs));
      } catch (err) { if (!cancelled) setNoteFolders([]); }
      finally { if (!cancelled) setFoldersLoading(false); }
    })();
    (async () => {
      try {
        const res = await dbStorage.getShared(SHARED_HOLIDAYS_KEY);
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!cancelled) setHolidays(parsed);
        } else if (isAdminSession(session)) {
          // Nobody has seeded the shared calendar yet — the admin's own
          // client does it once, here, so every other user's next load
          // finds a populated record instead of an empty one.
          try {
            await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(DEFAULT_HOLIDAYS_2026));
            if (!cancelled) setHolidays(DEFAULT_HOLIDAYS_2026);
          } catch (seedErr) {
            console.error("Failed to seed shared holiday calendar:", seedErr);
            notify(`Couldn't set up the shared holiday calendar — ${seedErr?.message || "check console for details"}.`, "error");
            if (!cancelled) setHolidays([]);
          }
        } else if (!cancelled) {
          setHolidays([]);
        }
      } catch (err) {
        console.error("Failed to read shared holiday calendar:", err);
        if (isAdminSession(session)) notify(`Couldn't read the shared holiday calendar — ${err?.message || "check console for details"}.`, "error");
        if (!cancelled) setHolidays([]);
      }
      finally { if (!cancelled) setHolidaysLoading(false); }
    })();
    checkForHolidayLogUpdates();
    (async () => {
      const googleEmail = session?.user?.email || "";
      const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || "";
      const googlePhoto = session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.picture || "";
      // Start from the Google session immediately — this is what shows if the
      // saved-profile read below fails for any reason (including before the
      // per-user migration has been run), rather than leaving the profile blank.
      let next = { name: googleName, nickname: "", email: googleEmail, avatarType: googlePhoto ? "custom" : null, avatarValue: googlePhoto };
      try {
        const res = await dbStorage.get("profile");
        const parsed = res && res.value ? JSON.parse(res.value) : null;
        if (parsed) {
          // A profile has been explicitly saved before — respect it exactly
          // as saved, including a deliberate "removed my photo" or "cleared
          // my name" choice. Only email still always tracks the Google
          // account, since it's the actual login identity, not a preference.
          next = {
            name: parsed.name,
            nickname: parsed.nickname || "",
            email: googleEmail || parsed.email || "",
            avatarType: parsed.avatarType,
            avatarValue: parsed.avatarValue,
          };
        }
        // else: no profile has ever been saved (first-ever login) — `next`
        // stays as the Google-session defaults set above.
      } catch (err) { /* fall back to the Google-session values already in `next` */ }
      if (!cancelled) setUserProfile(next);
      if (!cancelled) setProfileLoading(false);
    })();
    (async () => {
      try {
        const res = await dbStorage.get("home-prefs");
        if (!cancelled && res && res.value) {
          const parsed = JSON.parse(res.value);
          if (parsed && typeof parsed.journeyOpen === "boolean") setJourneyOpen(parsed.journeyOpen);
          if (parsed && typeof parsed.deepDiveOpen === "boolean") setDeepDiveOpen(parsed.deepDiveOpen);
        }
      } catch (err) { /* defaults (collapsed) stay */ }
      finally { if (!cancelled) setHomePrefsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Users who keep the app open for a while (rather than reloading) still
  // get told about holiday-calendar edits made by the admin in the
  // meantime — same check as on load, just re-run periodically.
  useEffect(() => {
    const interval = setInterval(() => { checkForHolidayLogUpdates(); }, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Tracks which trade ids have been edited since the last save — populated
  // by updatePnlEntry, which knows exactly which row changed but has no
  // save trigger of its own (it's called from many different table cells).
  // Only these specific rows get upserted, not the whole trade history.
  const dirtyPnlIdsRef = useRef(new Set());
  useEffect(() => {
    if (pnlLoading) return;
    const t = setTimeout(() => {
      const dirtyIds = dirtyPnlIdsRef.current;
      if (dirtyIds.size === 0) return;
      const rowsToSave = pnlEntries.filter((e) => dirtyIds.has(e.id)).map((e) => tradeJsToRow(e, currentUserId));
      dirtyPnlIdsRef.current = new Set();
      if (rowsToSave.length > 0) dbTable.upsert("trades", rowsToSave).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [pnlEntries, pnlLoading]);

  useEffect(() => {
    if (monthlyChargesLoading) return;
    const t = setTimeout(() => { dbStorage.set("pnl-monthly-charges", JSON.stringify(monthlyCharges)).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [monthlyCharges, monthlyChargesLoading]);

  useEffect(() => {
    if (capitalBaseLoading) return;
    const t = setTimeout(() => { dbStorage.set("capital-base", JSON.stringify(capitalBase)).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [capitalBase, capitalBaseLoading]);

  // No fund-transactions auto-save effect — every mutation (add, delete,
  // clear-all) is already a discrete operation with a known row, handled
  // directly at its own call site instead of via a generic whole-array save.

  useEffect(() => {
    if (profileLoading) return;
    const t = setTimeout(() => { dbStorage.set("profile", JSON.stringify(userProfile)).catch(() => {}); }, 500);
    return () => clearTimeout(t);
  }, [userProfile, profileLoading]);

  useEffect(() => {
    if (homePrefsLoading) return;
    const t = setTimeout(() => { dbStorage.set("home-prefs", JSON.stringify({ journeyOpen, deepDiveOpen })).catch(() => {}); }, 400);
    return () => clearTimeout(t);
  }, [journeyOpen, deepDiveOpen, homePrefsLoading]);

  useEffect(() => {
    if (!themeReady) return;
    const t = setTimeout(() => {
      dbStorage.set("theme-settings", JSON.stringify({ themeId, colorMode })).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [themeId, colorMode, themeReady]);

  useEffect(() => {
    if (checklistOverridesLoading) return;
    const t = setTimeout(() => {
      dbStorage.set("checklist-config", JSON.stringify(checklistOverrides)).catch(() => {});
    }, 500);
    return () => clearTimeout(t);
  }, [checklistOverrides, checklistOverridesLoading]);

  useEffect(() => { setHistoryPage(1); }, [rangeFrom, rangeTo]);

  useEffect(() => { if (mode === "no_trade" && topTab === "setup") setTopTab("checklist"); }, [mode, topTab]);
  useEffect(() => { if (mode === "no_trade") setActiveTab("data"); }, [mode]);
  useEffect(() => { if (mode === "no_trade") setChecklistManagerOpen(false); }, [mode]);
  useEffect(() => { setLegs(legsFromTemplate(strategyType, customStrategies)); }, [strategyType]);

  const capitalAffectingPL = useMemo(
    () => pnlEntries.reduce((s, e) => (e.affectsCapital !== false ? s + (parseFloat(e.overallPL) || 0) : s), 0),
    [pnlEntries]
  );
  const lifetimeChargesTotal = useMemo(
    () => Object.values(monthlyCharges || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [monthlyCharges]
  );
  const totalCapital = capitalBase + capitalAffectingPL - lifetimeChargesTotal;

  // The Risk Calculator's capital field defaults to (and keeps refreshing
  // from) the real total capital — but only while it hasn't been manually
  // edited away from that default. Once you type your own number in (to test
  // a separate "what if" amount), it's left alone and never written back to
  // total capital — the two are one-way linked (default only), not synced.
  const [lastAutoCapital, setLastAutoCapital] = useState(null);
  useEffect(() => {
    if (capitalBaseLoading || fundTransactionsLoading || pnlLoading || monthlyChargesLoading) return;
    const rounded = totalCapital ? totalCapital.toFixed(2) : "";
    setCapital((prev) => (prev === "" || prev === lastAutoCapital ? rounded : prev));
    setLastAutoCapital(rounded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCapital, capitalBaseLoading, fundTransactionsLoading, pnlLoading, monthlyChargesLoading]);

  const capNum = parseFloat(capital) || 0;
  const lossNum = parseFloat(plannedLoss) || 0;
  const pct = capNum > 0 && lossNum > 0 ? (lossNum / capNum) * 100 : null;
  const riskEdgePct = targetRiskPct * 1.5;
  const pctColor = pct === null ? "text-zinc-500" : pct <= targetRiskPct ? "text-[#04B488]" : pct <= riskEdgePct ? "text-amber-400" : "text-[#F15E3B]";
  const pctVerdict = pct === null ? "Enter capital and planned loss to check" : pct <= targetRiskPct ? `Within target — ${targetRiskPct}% or less of capital` : pct <= riskEdgePct ? `At the edge — ${targetRiskPct}% to ${riskEdgePct}% of capital` : `Oversized — reduce or skip, over ${riskEdgePct}% of capital`;

  const saveTargetRiskPct = async (pctVal) => {
    const clamped = Math.max(0.1, Math.min(20, pctVal));
    setTargetRiskPct(clamped);
    try { await dbStorage.set("target-risk-pct", JSON.stringify(clamped)); } catch (err) { /* best effort */ }
    notify(`Target risk set to ${clamped}%.`);
  };

  const applyRiskPct = (pctVal) => {
    if (!capNum || !pctVal) return;
    const clamped = Math.min(pctVal, 20);
    setPlannedLoss((capNum * (clamped / 100)).toFixed(2));
  };

  const activeRiskPct = pct === null ? null : [1, 2, 3].find((p) => Math.abs(pct - p) < 0.05) || null;

  const netPremium = useMemo(() => {
    return legs.reduce((sum, leg) => {
      if (leg.type !== "CE" && leg.type !== "PE") return sum;
      const prem = parseFloat(leg.premium) || 0, qty = parseFloat(leg.qty) || 0;
      return sum + (leg.action === "Sell" ? 1 : -1) * prem * qty;
    }, 0);
  }, [legs]);
  const payoffInfo = useMemo(() => computeStrategyPayoff(profile, legs), [profile, legs]);

  const sections = useMemo(() => buildEffectiveSections(checklistOverrides), [checklistOverrides]);

  const applicableItemsFor = (prof, stratId) => {
    const all = sections.flatMap((s) => s.items);
    return all.filter((i) => {
      if (i.applies === "all") return true;
      if (i.appliesBy === "id") return i.applies.includes(stratId);
      return i.applies.includes(prof);
    });
  };
  const applicableItems = useMemo(() => applicableItemsFor(profile, strategyType), [profile, strategyType, sections]);
  const totalApplicable = applicableItems.length;
  const totalChecked = applicableItems.filter((i) => checked[i.id]).length;
  const criticalApplicable = applicableItems.filter((i) => i.critical);
  const missingCritical = criticalApplicable.filter((i) => !checked[i.id]);
  const readyToTrade = criticalApplicable.length > 0 && missingCritical.length === 0;
  const legsComplete = legs.length > 0 && legs.every(isLegComplete);

  const itemToSection = useMemo(() => {
    const map = {};
    sections.forEach((s) => s.items.forEach((i) => { map[i.id] = s.id; }));
    return map;
  }, [sections]);

  const scoredRows = useMemo(() => DATA_ROWS.filter((r) => dataReads[r.id] !== undefined).map((r) => (r.contrarian ? -dataReads[r.id] : dataReads[r.id])), [dataReads]);
  const marketAvg = scoredRows.length ? scoredRows.reduce((a, b) => a + b, 0) / scoredRows.length : null;
  const marketVerdict = getVerdict(marketAvg);

  const progressPct = mode === "no_trade"
    ? (DATA_ROWS.length ? Math.round(Object.keys(dataReads).length / DATA_ROWS.length * 100) : 0)
    : (totalApplicable > 0 ? Math.round(totalChecked / totalApplicable * 100) : 0);

  const tabs = useMemo(() => {
    const dataTab = { id: "data", num: null, label: "Market Read", badge: `${Object.keys(dataReads).length}/${DATA_ROWS.length}`, warn: false };
    const sectionTabs = sections.map((s) => {
      const applic = applicableItemsFor(profile, strategyType).filter((i) => s.items.includes(i));
      const cnt = applic.filter((i) => checked[i.id]).length;
      const warn = applic.some((i) => i.critical && !checked[i.id]);
      return { id: s.id, num: s.num, label: s.title, badge: `${cnt}/${applic.length}`, warn };
    });
    return [dataTab, ...sectionTabs];
  }, [profile, strategyType, checked, dataReads, sections]);

  const activeSection = activeTab !== "data" ? sections.find((s) => s.id === activeTab) : null;

  const handleModeToggle = (newMode) => {
    if (newMode === mode) return;
    const wasOnMarketRead = activeTab === "data";
    setRegion2Animated(wasOnMarketRead);
    if (!wasOnMarketRead) {
      setSpecialSlideActive(true);
      setActiveTab("data");
    }
    setMode(newMode);
  };

  // One-shot flag — clears itself shortly after the forced switch to
  // Market Read so a subsequent, ordinary tab click goes back to the
  // normal tj-slide-in rather than replaying the special left-slide.
  useEffect(() => {
    if (!specialSlideActive) return;
    const t = setTimeout(() => setSpecialSlideActive(false), 500);
    return () => clearTimeout(t);
  }, [activeTab, specialSlideActive]);

  // Locked in via useMemo (dependency on activeTab only, not
  // specialSlideActive) so this content instance's animation choice never
  // changes mid-lifecycle. Without this, specialSlideActive resetting to
  // false a moment later would flip the CSS class on the *same already-
  // mounted* element — and browsers restart a CSS animation whenever its
  // animation-name changes, even without a DOM remount, causing the new
  // class's from-state (opacity: 0) to flash briefly over content that had
  // already fully animated in.
  const contentUsesSpecialSlide = useMemo(() => specialSlideActive, [activeTab]);

  const toggleItem = useCallback((id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const toggleAllInSection = useCallback((ids, value) => setChecked((prev) => { const next = { ...prev }; ids.forEach((id) => { next[id] = value; }); return next; }), []);
  const setDataRow = useCallback((id, value) => setDataReads((prev) => {
    if (prev[id] === value) {
      const next = { ...prev };
      delete next[id];
      return next;
    }
    return { ...prev, [id]: value };
  }), []);
  const addLeg = useCallback(() => setLegs((prev) => [...prev, { id: freshLegId(), name: "", action: "Sell", type: "CE", strike: "", premium: "", qty: "", lotSize: "", expiry: "", openedAt: Date.now() }]), []);
  const removeLeg = useCallback((id) => setLegs((prev) => prev.filter((l) => l.id !== id)), []);
  const updateLeg = useCallback((id, field, value) => setLegs((prev) => prev.map((l) => {
    if (l.id !== id) return l;
    const next = { ...l, [field]: value };
    if (field === "type" && (value === "FUT" || value === "Other")) next.premium = "";
    if (field === "type" && value === "Other") next.lotSize = "";
    return next;
  })), []);

  const resetTradeSetup = () => {
    setChecked({});
    setNotes("");
    setScreenshots([]);
    setPlannedLoss("");
    setStrategyType("");
    setStrategyCategory(null);
    setLegs([]);
    setUnderlying("");
    setEntryMood(null);
    setEntryMoodNote("");
    setEntryMoodNoteOpen(false);
    setEntryMoodNoteDraft("");
    // Data Read (the 11-point market context) is intentionally left alone —
    // it doesn't change much through the day, so it carries over to the next
    // check instead of forcing a refill. Still fully editable if it needs updating.
  };

  const startNewCheck = () => {
    if (mode === "no_trade") { setNotes(""); setEntryMood(null); setEntryMoodNote(""); setEntryMoodNoteOpen(false); setEntryMoodNoteDraft(""); return; }
    resetTradeSetup();
  };

  const addCustomStrategy = async (values) => {
    if (!values.name.trim()) { playErrorBeep(); return; }
    const existingIds = allStrategies.map((s) => s.id);
    const id = makeUniqueId(slugify(values.name), existingIds);
    const entry = { id, label: values.name.trim(), profile: values.profile, category: values.category, legTemplate: values.legTemplate };
    const next = [...customStrategies, entry];
    setCustomStrategies(next);
    setStrategyCategory(values.category);
    setStrategyType(id);
    setShowAddStrategy(false);
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy added — ${entry.label}.`);
  };

  const editCustomStrategy = async (id, values) => {
    const next = customStrategies.map((s) => (s.id === id ? { ...s, label: values.name.trim(), profile: values.profile, category: values.category, legTemplate: values.legTemplate } : s));
    setCustomStrategies(next);
    if (strategyType === id) {
      if (values.category !== strategyCategory) setStrategyCategory(values.category);
      setLegs(legsFromTemplate(id, next));
    }
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy updated — ${values.name.trim()}.`);
  };

  const deleteCustomStrategy = async (id) => {
    const target = customStrategies.find((s) => s.id === id);
    const next = customStrategies.filter((s) => s.id !== id);
    setCustomStrategies(next);
    if (strategyType === id) {
      const opts = [...DEFAULT_STRATEGIES, ...next].filter((s) => (s.category || "other") === strategyCategory);
      setStrategyType(opts.length > 0 ? opts[0].id : DEFAULT_STRATEGIES[0].id);
    }
    try { await dbStorage.set("custom-strategies", JSON.stringify(next)); } catch (e) { /* best effort */ }
    notify(`Strategy deleted — ${target ? target.label : ""}.`);
  };

  // ---- Checklist item management (create / edit / delete checklist points) ----
  const addChecklistItem = (sectionId, values) => {
    const existingIds = sections.flatMap((s) => s.items.map((i) => i.id));
    const id = freshChecklistItemId(existingIds);
    const newItem = {
      id,
      label: values.label.trim(),
      sub: values.sub ? values.sub.trim() : "",
      critical: !!values.critical,
      applies: values.applies === "all" ? "all" : values.applies,
    };
    setChecklistOverrides((prev) => ({
      ...prev,
      customItems: { ...prev.customItems, [sectionId]: [...(prev.customItems[sectionId] || []), newItem] },
    }));
    notify(`Checklist item added — ${newItem.label}.`);
  };

  const editChecklistItem = (item, sectionId, values) => {
    const updated = {
      label: values.label.trim(),
      sub: values.sub ? values.sub.trim() : "",
      critical: !!values.critical,
      applies: values.applies === "all" ? "all" : values.applies,
    };
    setChecklistOverrides((prev) => {
      const isCustom = (prev.customItems[sectionId] || []).some((i) => i.id === item.id);
      if (isCustom) {
        return {
          ...prev,
          customItems: {
            ...prev.customItems,
            [sectionId]: prev.customItems[sectionId].map((i) => (i.id === item.id ? { ...i, ...updated } : i)),
          },
        };
      }
      return { ...prev, itemOverrides: { ...prev.itemOverrides, [item.id]: updated } };
    });
    notify(`Checklist item updated — ${values.label.trim()}.`);
  };

  const deleteChecklistItem = (item, sectionId) => {
    setChecklistOverrides((prev) => {
      const isCustom = (prev.customItems[sectionId] || []).some((i) => i.id === item.id);
      if (isCustom) {
        return {
          ...prev,
          customItems: { ...prev.customItems, [sectionId]: prev.customItems[sectionId].filter((i) => i.id !== item.id) },
        };
      }
      return { ...prev, deletedItemIds: [...prev.deletedItemIds, item.id] };
    });
    // Also clear any saved checked-state for this item so it can't linger as a
    // "checked" entry for an item that no longer exists.
    setChecked((prev) => {
      if (!(item.id in prev)) return prev;
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    notify(`Checklist item deleted — ${item.label}.`);
  };

  const editChecklistSectionTitle = (sectionId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const isDefaultSection = DEFAULT_SECTION_DEFS.some((s) => s.id === sectionId);
    if (isDefaultSection) {
      setChecklistOverrides((prev) => ({ ...prev, sectionTitleOverrides: { ...prev.sectionTitleOverrides, [sectionId]: trimmed } }));
    } else {
      setChecklistOverrides((prev) => ({
        ...prev,
        customSections: prev.customSections.map((s) => (s.id === sectionId ? { ...s, title: trimmed } : s)),
      }));
    }
    notify(`Checklist section renamed — ${trimmed}.`);
  };

  const addChecklistSection = (title) => {
    if (!title.trim()) return;
    const existingIds = [...DEFAULT_SECTION_DEFS.map((s) => s.id), ...checklistOverrides.customSections.map((s) => s.id)];
    const id = makeUniqueId(slugify(title), existingIds);
    setChecklistOverrides((prev) => ({ ...prev, customSections: [...prev.customSections, { id, title: title.trim() }] }));
    notify(`Checklist section added — ${title.trim()}.`);
  };

  const deleteChecklistSection = (sectionId) => {
    const targetTitle = (checklistOverrides.customSections.find((s) => s.id === sectionId) || {}).title || "";
    let removedItemIds = [];
    setChecklistOverrides((prev) => {
      const nextCustomItems = { ...prev.customItems };
      removedItemIds = (nextCustomItems[sectionId] || []).map((i) => i.id);
      delete nextCustomItems[sectionId];
      return {
        ...prev,
        customSections: prev.customSections.filter((s) => s.id !== sectionId),
        customItems: nextCustomItems,
      };
    });
    setChecked((prev) => {
      if (removedItemIds.length === 0) return prev;
      const next = { ...prev };
      removedItemIds.forEach((id) => delete next[id]);
      return next;
    });
    if (activeTab === sectionId) setActiveTab("data");
    notify(`Checklist section deleted — ${targetTitle}.`);
  };

  const handleSaveClick = () => {
    if (mode === "trade" && !readyToTrade) {
      setIncompleteChecklistDialogOpen(true);
      return;
    }
    saveCheck();
  };

  const saveCheck = async () => {
    if (mode === "trade" && (!currentStrategy || !underlying.trim() || !legsComplete)) { playErrorBeep(); return; }
    setSaveStatus("saving");
    const nowTs = Date.now();
    const daysSnap = mode === "trade" && expiryDate ? daysUntil(expiryDate) : null;
    const sharedPnlId = mode === "trade" ? freshPnlId() : null;
    const entry = {
      ts: nowTs,
      dateLabel: fmtDateTimeDMY(nowTs),
      entryDate: localISODate(nowTs),
      mode,
      strategyType: mode === "trade" ? strategyType : null,
      underlying: mode === "trade" ? underlying : null,
      capital: mode === "trade" ? capNum : null,
      plannedLoss: mode === "trade" ? lossNum : null,
      pct: mode === "trade" ? pct : null,
      totalChecked: mode === "trade" ? totalChecked : null,
      totalApplicable: mode === "trade" ? totalApplicable : null,
      ready: mode === "trade" ? readyToTrade : null,
      expiryDate: mode === "trade" ? (expiryDate || null) : null,
      daysToExpirySnapshot: daysSnap,
      legs: mode === "trade" ? legs.filter((l) => l.name || l.strike || l.premium) : null,
      marketRead: marketVerdict.label,
      dataPointsFilled: Object.keys(dataReads).length,
      dataReadsSnapshot: { ...dataReads },
      notes,
      pnlId: sharedPnlId,
      entryMood: entryMood || null,
      entryMoodNote: entryMoodNote || "",
    };
    try {
      let pnlEntry = null;
      if (mode === "trade") {
        const { legsDesc, premiumDesc } = legsToParts(legs);
        const filledLegs = legs.filter((l) => l.name || l.strike || l.premium);
        pnlEntry = {
          id: sharedPnlId,
          entryDate: localISODate(nowTs),
          exitDate: "",
          underlying: underlying,
          strategyLabel: currentStrategy ? currentStrategy.label : "",
          legsSummary: legsDesc,
          premiumSummary: premiumDesc,
          legs: filledLegs,
          netPremium: computeNetPremiumSigned(filledLegs),
          expiryDate: expiryDate || "",
          overallPL: "",
          notes: notes,
          affectsCapital: true,
          screenshots: screenshots,
        };
        // The trade row must exist before the history row that references
        // it via pnl_id (a real foreign key) — insert order matters here in
        // a way it never did with the old blob-based storage.
        await dbTable.insert("trades", tradeJsToRow(pnlEntry, currentUserId));
      }
      await dbTable.insert("checklist_history", historyJsToRow(entry, currentUserId));
      setHistory((prev) => [entry, ...prev]);
      if (pnlEntry) {
        setPnlEntries((prev) => [pnlEntry, ...prev]);
        setSelectedMonthKey(monthKeyOf(pnlEntry.entryDate));
        resetTradeSetup();
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2200);
      notify(mode === "trade" ? `Trade check saved — ${underlying || "trade"}.` : "Market read saved.");
    } catch (err) { setSaveStatus("error"); setTimeout(() => setSaveStatus("idle"), 3000); }
  };

  const deleteEntry = async (ts) => {
    const target = history.find((h) => h.ts === ts);
    const next = history.filter((h) => h.ts !== ts);
    setHistory(next);
    setPendingDeleteTs(null);

    // Deleting a "Funds Added"/"Withdrawal" log entry also reverses the actual
    // fund transaction it represents, so capital and the log never drift apart.
    if (target && (target.mode === "funds_added" || target.mode === "funds_withdrawn") && target.fundTxId) {
      setFundTransactions((prev) => prev.filter((t) => t.id !== target.fundTxId));
      setCapitalBase((prev) => Math.max(0, prev + (target.mode === "funds_added" ? -target.amount : target.amount)));
      try { await dbTable.deleteById("fund_transactions", target.fundTxId); } catch (e) { /* best effort */ }
    }

    try { await dbTable.deleteWhere("checklist_history", "ts", ts); } catch (e) { /* best effort */ }
    notify(`Log entry deleted — ${target ? isoToShortDate(target.entryDate || localISODate(target.ts)) : ""}.`);
  };

  const confirmDeleteEntry = (ts) => {
    setDeletingHistoryTs(ts);
    setTimeout(() => { deleteEntry(ts); setDeletingHistoryTs(null); }, 320);
  };

  const addFundTransaction = async (type, amount, date, notes) => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) return;
    if (type === "withdrawal" && amt > capitalBase) return; // never let capital go negative
    const txId = "fundtx_" + Date.now();
    const tx = { id: txId, date, type, amount: amt };
    const newCapitalBase = capitalBase + (type === "deposit" ? amt : -amt);
    const capitalAfter = newCapitalBase + capitalAffectingPL - lifetimeChargesTotal;

    const logTs = Date.now();
    const logEntry = {
      ts: logTs,
      dateLabel: isoToWordDate(date) + ", " + fmtTimeOnly(logTs),
      entryDate: date,
      mode: type === "deposit" ? "funds_added" : "funds_withdrawn",
      fundTxId: txId,
      amount: amt,
      capitalAfter,
      notes: notes || "",
    };
    try {
      // The fund transaction row must exist before the history row that
      // references it via fund_tx_id (a real foreign key).
      await dbTable.insert("fund_transactions", fundTxJsToRow(tx, currentUserId));
      await dbTable.insert("checklist_history", historyJsToRow(logEntry, currentUserId));
      setFundTransactions((prev) => [tx, ...prev]);
      setCapitalBase(newCapitalBase);
      setHistory((prev) => [logEntry, ...prev]);
      notify(type === "deposit" ? `${fmtINR(amt)} added to capital.` : `${fmtINR(amt)} withdrawn from capital.`);
    } catch (e) {
      notify(`Couldn't save that ${type === "deposit" ? "deposit" : "withdrawal"} — please try again.`, "error");
    }
  };

  // Any log entry linked to a P&L row (via pnlId) — whether it's a full
  // checklist "trade" or a quick/past trade — gets its legs, exit date,
  // overall P/L, and net premium pulled LIVE from that row, so edits made
  // later in the P&L table always show up in the log and its exports. Notes
  // and checklist-specific fields (capital, planned loss, market read, etc.)
  // stay as their own original snapshot for full-checklist trades.
  const resolvePastTradeDisplay = (h) => {
    if (!h.pnlId) return h;
    const linked = pnlEntries.find((e) => e.id === h.pnlId);
    if (!linked) return h;
    if (h.mode === "past_trade") {
      return {
        ...h,
        underlying: linked.underlying || null,
        strategyLabel: linked.strategyLabel || null,
        notes: h.notes || linked.notes || "",
        expiryDate: linked.expiryDate || null,
        exitDate: linked.exitDate || null,
        legsSummary: linked.legsSummary || "",
        premiumSummary: linked.premiumSummary || "",
        overallPL: linked.overallPL || "",
        legs: linked.legs || [],
        netPremium: linked.netPremium,
        capital: totalCapital || null,
        exitMood: linked.exitMood || null,
        exitMoodNote: linked.exitMoodNote || null,
      };
    }
    return {
      ...h,
      legs: (linked.legs && linked.legs.length > 0) ? linked.legs : h.legs,
      netPremium: linked.netPremium,
      expiryDate: linked.expiryDate || h.expiryDate,
      exitDate: linked.exitDate || null,
      overallPL: linked.overallPL || "",
      exitMood: linked.exitMood || null,
      exitMoodNote: linked.exitMoodNote || null,
    };
  };

  const getEntryFilenameBase = (h, enriched) => {
    const dateStr = h.entryDate || localISODate(h.ts);
    const category = logCategoryName(h);
    if (category === "trade" && enriched.underlying) {
      return `trade_${enriched.underlying.toLowerCase()}_${dateStr}`;
    }
    return `${category}_log_${dateStr}`;
  };

  const openLogAsPdf = async (h) => {
    const enriched = resolvePastTradeDisplay(h);
    const filenameBase = getEntryFilenameBase(h, enriched);
    try {
      const doc = await buildLogDetailPDF(enriched, strategyLabelLookup);
      doc.save(`${filenameBase}.pdf`);
      notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToDMY(enriched.entryDate || localISODate(h.ts))}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  const downloadLogEntryAsMarkdown = (h) => {
    const enriched = resolvePastTradeDisplay(h);
    const filenameBase = getEntryFilenameBase(h, enriched);
    const md = buildMarkdownFromHistory([enriched], h.dateLabel, strategyLabelLookup);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`Log entry downloaded — ${enriched.underlying ? enriched.underlying + ", " : ""}${isoToDMY(enriched.entryDate || localISODate(h.ts))}.`);
  };

  const updatePnlEntry = useCallback((id, field, value) => {
    dirtyPnlIdsRef.current.add(id);
    setPnlEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  }, []);

  const recordTradeChange = async (pnlId, changeDescriptor) => {
    const idx = history.findIndex((h) => h.pnlId === pnlId);
    if (idx === -1) return;
    const target = history[idx];
    const nowTs = Date.now();
    const changeEntry = { ts: nowTs, ...changeDescriptor };
    const nextChanges = [...(target.changes || []), changeEntry];
    setHistory((prev) => prev.map((h, i) => (i === idx ? { ...h, changes: nextChanges } : h)));
    try { await dbTable.updateWhere("checklist_history", "ts", target.ts, { changes: nextChanges }); } catch (e) { /* best effort */ }
  };

  // When a holiday lands on a Tuesday, any already-saved trade with a leg
  // expiring that day shifts back to the previous trading day (Monday) — the
  // same rule the expiry picker applies going forward. Each shifted leg is
  // tagged with which holiday caused it (holidayShift: {holidayId, from}), so
  // if that holiday is later edited to a different date or deleted entirely,
  // the shift can be reverted precisely — without touching a leg the user
  // deliberately set to Monday themselves for unrelated reasons.
  const applyHolidayReconciliation = async (holidayId, newDateISO) => {
    let mondayISO = null;
    if (newDateISO) {
      const [y, m, d] = newDateISO.split("-").map(Number);
      if (new Date(y, m - 1, d).getDay() === 2) {
        const monday = new Date(y, m - 1, d);
        monday.setDate(monday.getDate() - 1);
        mondayISO = localISODate(monday.getTime());
      }
    }

    let historyNext = history;
    const changedTrades = [];
    const changedHistoryEntries = [];

    const nextEntries = pnlEntries.map((entry) => {
      if (!entry.legs || entry.legs.length === 0) return entry;
      let legsChanged = false;
      const newLegs = entry.legs.map((leg) => {
        // This leg was previously auto-shifted by this exact holiday — undo
        // it (and re-shift immediately if the holiday's new date still lands
        // on this leg's original expiry).
        if (leg.holidayShift && leg.holidayShift.holidayId === holidayId) {
          legsChanged = true;
          const original = leg.holidayShift.from;
          const { holidayShift, ...rest } = leg;
          if (mondayISO && original === newDateISO) {
            return { ...rest, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
          }
          return { ...rest, expiry: original };
        }
        // This leg's expiry matches a newly added/moved holiday and isn't
        // already tracked — apply a fresh forward shift.
        if (mondayISO && leg.expiry === newDateISO && !leg.holidayShift) {
          legsChanged = true;
          return { ...leg, expiry: mondayISO, holidayShift: { holidayId, from: newDateISO } };
        }
        return leg;
      });
      if (!legsChanged) return entry;

      const { legsDesc, premiumDesc } = legsToParts(newLegs);
      const newExpiryDate = nearestLegExpiry(newLegs);
      const updatedEntry = { ...entry, legs: newLegs, legsSummary: legsDesc, premiumSummary: premiumDesc, expiryDate: newExpiryDate };
      changedTrades.push(updatedEntry);

      const idx = historyNext.findIndex((h) => h.pnlId === entry.id);
      if (idx !== -1) {
        if (historyNext === history) historyNext = [...history];
        const target = historyNext[idx];
        const changeEntry = {
          ts: Date.now(),
          type: "fields",
          changes: [{ field: "Leg expiry", from: "previous value", to: "updated — holiday calendar changed" }],
        };
        const updatedHistoryEntry = { ...target, changes: [...(target.changes || []), changeEntry] };
        historyNext[idx] = updatedHistoryEntry;
        changedHistoryEntries.push(updatedHistoryEntry);
      }

      return updatedEntry;
    });

    if (changedTrades.length > 0) {
      setPnlEntries(nextEntries);
      try { await dbTable.upsert("trades", changedTrades.map((e) => tradeJsToRow(e, currentUserId))); } catch (e) { /* best effort */ }
    }
    if (changedHistoryEntries.length > 0) {
      setHistory(historyNext);
      try {
        await dbTable.upsertOnConflict("checklist_history", changedHistoryEntries.map((h) => historyJsToRow(h, currentUserId)), "user_id,ts");
      } catch (e) { /* best effort */ }
    }
  };

  // Gathers every category of user data into one JSON file and triggers a
  // browser download — a backup, not a formatted report (that's what the
  // PDF/MD exports are for). Deliberately excludes profile, PIN, theme, and
  // holidays: those are configuration you set up fresh per install, not
  // data you'd need to recover.
  const downloadFullBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      pnlEntries,
      checklistHistory: history,
      fundTransactions,
      customStrategies,
      learningNotes,
      noteFolders,
      monthlyCharges,
      capitalBase,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `comet-backup-${localISODate(Date.now())}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Backup downloaded.");
  };

  // Wipes whichever categories are selected in the checklist. Each
  // category is independent — theme, holidays, and the profile itself are
  // never touched here, since those are configuration, not user data.
  const clearSelectedData = async (scope) => {
    const jobs = [];
    if (scope.trading) {
      setPnlEntries([]);
      setHistory([]);
      setFundTransactions([]);
      setCapitalBase(0);
      setMonthlyCharges({});
      dirtyPnlIdsRef.current = new Set();
      jobs.push(
        dbTable.deleteAllForUser("trades"),
        dbTable.deleteAllForUser("checklist_history"),
        dbTable.deleteAllForUser("fund_transactions"),
        dbStorage.set("capital-base", JSON.stringify(0)),
        dbStorage.set("pnl-monthly-charges", JSON.stringify({})),
        deleteAllTradeStorageFilesForUser(),
      );
    }
    if (scope.strategies) {
      setCustomStrategies([]);
      jobs.push(dbStorage.set("custom-strategies", JSON.stringify([])));
    }
    if (scope.learnings) {
      setLearningNotes([]);
      setNoteFolders([]);
      try {
        localStorage.removeItem("tj-open-tabs");
        localStorage.removeItem("tj-active-tab");
        localStorage.removeItem("tj-recently-viewed");
      } catch {}
      jobs.push(dbTable.deleteAllForUser("notes"), dbTable.deleteAllForUser("note_folders"), deleteAllNoteStorageFilesForUser());
    }
    if (scope.reminders) {
      setReminders([]);
      setReminderSeverityOverrides({});
      setReminderHiddenSubcategories([]);
      setReminderCustomSubcategories([]);
      setReminderAlarmDismissed({});
      jobs.push(
        dbTable.deleteAllForUser("reminders"),
        dbStorage.set("reminder-severity-overrides", JSON.stringify({})),
        dbStorage.set("reminder-hidden-subcategories", JSON.stringify([])),
        dbStorage.set("reminder-custom-subcategories", JSON.stringify([])),
        dbStorage.set("reminder-alarm-dismissed", JSON.stringify({})),
      );
    }
    try {
      await Promise.all(jobs);
    } catch (e) { /* best effort */ }
    notify("Selected data cleared.");
  };

  const deleteMyAccount = async () => {
    try { await dbStorage.set("account-deletion-requested-at", JSON.stringify(Date.now())); } catch (e) { /* best effort */ }
    notify("Account scheduled for deletion in 7 days.");
    sessionStorage.removeItem("tj-pin-unlocked");
    await supabase.auth.signOut();
  };

  const appendHolidayLogEntry = async (message) => {
    try {
      const res = await dbStorage.getShared(SHARED_HOLIDAY_LOG_KEY);
      const existing = res && res.value ? JSON.parse(res.value) : [];
      const entry = { id: `hlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, message, createdAt: Date.now() };
      const next = [entry, ...(Array.isArray(existing) ? existing : [])].slice(0, 30);
      await dbStorage.setShared(SHARED_HOLIDAY_LOG_KEY, JSON.stringify(next));
      // The admin already got a direct notify() call above for their own
      // edit — advance their own marker past it so the generic "notify me
      // about anything new in the shared log" check doesn't fire again for
      // the same change.
      await dbStorage.set("holiday-log-last-seen", JSON.stringify(entry.createdAt));
    } catch (err) {
      // The holiday change itself already succeeded — but if this part
      // fails silently, other users never learn about the change at all,
      // with nothing in the UI to explain why. Surface it visibly instead.
      console.error("Failed to log holiday change:", err);
      notify(`Holiday saved, but other users won't be notified — ${err?.message || "check console for details"}.`, "error");
    }
  };

  const saveHoliday = async (holiday, isEdit) => {
    if (!isAdminSession(session)) return;
    const next = isEdit ? holidays.map((h) => (h.id === holiday.id ? holiday : h)) : [holiday, ...holidays];
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to save holiday:", err);
      notify(`Couldn't save that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(holiday.id, holiday.date);
    const message = `${isEdit ? "Holiday updated" : "Holiday added"} — ${holiday.name}, ${isoToShortDate(holiday.date)}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  const deleteHoliday = async (id) => {
    if (!isAdminSession(session)) return;
    const target = holidays.find((h) => h.id === id);
    if (target && parseInt(target.date.slice(0, 4), 10) < new Date().getFullYear()) return; // archived — read-only
    const next = holidays.filter((h) => h.id !== id);
    try {
      await dbStorage.setShared(SHARED_HOLIDAYS_KEY, JSON.stringify(next));
    } catch (err) {
      console.error("Failed to delete holiday:", err);
      notify(`Couldn't delete that holiday — ${err?.message || "check console for details"}.`, "error");
      return;
    }
    setHolidays(next);
    await applyHolidayReconciliation(id, null); // null date -> pure revert, no forward shift
    const message = `Holiday deleted — ${target ? target.name : ""}.`;
    notify(message);
    await appendHolidayLogEntry(message);
  };

  const saveProfile = (nextProfile) => {
    setUserProfile(nextProfile);
  };

  const deletePnlEntry = async (id, silent) => {
    const targetIndex = pnlEntries.findIndex((e) => e.id === id);
    const target = pnlEntries[targetIndex];
    setPnlEntries((prev) => prev.filter((e) => e.id !== id));
    setPnlPendingDeleteId(null);
    dirtyPnlIdsRef.current.delete(id); // no longer relevant if a pending edit hadn't saved yet

    // Also remove the Trade Log entry linked to this trade (regular trade
    // checklist saves and backfilled past trades both carry a matching
    // pnlId), so a deleted trade doesn't leave an orphaned log entry behind.
    const linkedIndex = history.findIndex((h) => h.pnlId === id);
    const linked = linkedIndex === -1 ? null : history[linkedIndex];
    if (linked) setHistory((prev) => prev.filter((h) => h.pnlId !== id));

    const performDelete = async () => {
      if (linked) { try { await dbTable.deleteWhere("checklist_history", "pnl_id", id); } catch (e) { /* best effort */ } }
      try { await dbTable.deleteById("trades", id); } catch (e) { /* best effort */ }
      if (target && target.screenshots) deleteTradeScreenshotFiles(target.screenshots);
    };

    if (silent) {
      // Abandoning a never-saved draft row — there's nothing real to undo,
      // and the row never existed in the DB to begin with, so delete
      // (of the in-memory row only) happens immediately, same as before.
      await performDelete();
      return;
    }

    const restoreLocal = () => {
      if (target) setPnlEntries((prev) => { const next = [...prev]; next.splice(Math.min(targetIndex, next.length), 0, target); return next; });
      if (linked) setHistory((prev) => { const next = [...prev]; next.splice(Math.min(linkedIndex, next.length), 0, linked); return next; });
    };
    deleteWithUndo({
      message: `Trade deleted — ${target && target.underlying ? target.underlying + ", " : ""}${target ? isoToShortDate(target.entryDate) : ""}.`,
      performDelete,
      restoreLocal,
    });
  };
  const confirmDeletePnlEntry = (id) => {
    setDeletingPnlId(id);
    setTimeout(() => { deletePnlEntry(id); setDeletingPnlId(null); }, 320);
  };
  const setMonthlyCharge = useCallback((monthKey, value) => setMonthlyCharges((prev) => ({ ...prev, [monthKey]: value })), []);
  const isNonBusinessDayISO = (iso, holidayList) => {
    if (!iso) return false;
    return isWeekendISO(iso) || (holidayList || []).some((h) => h.date === iso);
  };

  const openAddTradeDialog = () => {
    const today = localISODate(Date.now());
    // Don't default to today if today itself isn't a valid trade date (a
    // weekend or holiday) — silently prefilling an invalid date is exactly
    // how a Saturday could slip through if the user just clicks straight
    // through without noticing. Leave it blank instead, forcing a
    // conscious pick from the (already weekend/holiday-blocked) calendar.
    setAddTradeDate(isNonBusinessDayISO(today, holidays) ? "" : today);
    setAddTradeAffectsCapital(null);
    setAddTradeDialogClosing(false);
    setAddTradeDialogOpen(true);
  };

  const closeAddTradeDialog = () => {
    setAddTradeDialogClosing(true);
    setTimeout(() => {
      setAddTradeDialogOpen(false);
      setAddTradeDialogClosing(false);
      setAddTradeMoodStepTs(null);
      setAddTradeSelectedMood(null);
    }, 180);
  };

  const confirmAddTrade = async () => {
    if (!addTradeDate || isNonBusinessDayISO(addTradeDate, holidays)) return; // defensive guard — the button itself is disabled for this case
    const date = addTradeDate;
    const isPastDate = date < localISODate(Date.now());
    const sharedId = freshPnlId();
    const newEntry = {
      id: sharedId,
      entryDate: date,
      exitDate: "",
      underlying: "",
      strategyLabel: "",
      legsSummary: "",
      premiumSummary: "",
      expiryDate: "",
      overallPL: "",
      notes: "",
      affectsCapital: isPastDate ? addTradeAffectsCapital : true,
    };

    // Always log this trade so it shows up in the Trade Log, positioned by its
    // actual trade date. It's tagged internally the same way regardless of
    // date — the log list and exports decide whether to show it as "Past
    // Trade" or just "Trade" based on whether that date is actually in the
    // past, so a trade added for today correctly reads as "Trade", not "Past
    // Trade". Linked to the P&L row above via pnlId, so the log always
    // reflects whatever underlying/strategy/notes you later fill in on that row.
    const logTs = Date.now();
    const logEntry = {
      ts: logTs,
      dateLabel: isoToWordDate(date) + ", " + fmtTimeOnly(logTs),
      entryDate: date,
      mode: "past_trade",
      pnlId: sharedId,
      strategyType: null,
      underlying: null,
      capital: null,
      plannedLoss: null,
      pct: null,
      totalChecked: null,
      totalApplicable: null,
      ready: null,
      expiryDate: null,
      daysToExpirySnapshot: null,
      legs: null,
      marketRead: null,
      dataPointsFilled: 0,
      dataReadsSnapshot: {},
      notes: "",
    };
    try {
      // The trade row must exist before the history row that references it
      // via pnl_id (a real foreign key).
      await dbTable.insert("trades", tradeJsToRow(newEntry, currentUserId));
      await dbTable.insert("checklist_history", historyJsToRow(logEntry, currentUserId));
      setPnlEntries((prev) => [newEntry, ...prev]);
      setSelectedMonthKey(monthKeyOf(date));
      setNewTradeIdToEdit(sharedId);
      setHistory((prev) => [logEntry, ...prev]);
    } catch (e) {
      notify("Couldn't add that trade — please try again.", "error");
      return;
    }
    if (date === localISODate(Date.now())) {
      setAddTradeMoodStepTs(logTs);
    } else {
      closeAddTradeDialog();
    }
  };

  const saveAddTradeMood = async () => {
    const ts = addTradeMoodStepTs;
    const mood = addTradeSelectedMood;
    if (!ts || !mood) { closeAddTradeDialog(); return; }
    setHistory((prev) => prev.map((h) => (h.ts === ts ? { ...h, entryMood: mood } : h)));
    try { await dbTable.updateWhere("checklist_history", "ts", ts, { entry_mood: mood }); } catch (e) { /* best effort */ }
    closeAddTradeDialog();
  };
  const skipAddTradeMood = () => closeAddTradeDialog();

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      const da = a.entryDate || localISODate(a.ts);
      const db = b.entryDate || localISODate(b.ts);
      if (da !== db) return da < db ? 1 : -1; // newest trade date first
      return (b.ts || 0) - (a.ts || 0); // same-day: most recently saved first
    });
  }, [history]);

  const passesMoodFilter = (h) => {
    if (!moodFilterPoint) return true;
    const displayH = h.pnlId ? resolvePastTradeDisplay(h) : h;
    const entryVal = h.entryMood || null;
    const exitVal = displayH.exitMood || null;
    const primaryVal = moodFilterPoint === "entry" ? entryVal : exitVal;
    const otherVal = moodFilterPoint === "entry" ? exitVal : entryVal;
    if (!moodFilterMood) return primaryVal !== null; // point picked, mood still "Any" — just require something tagged there
    if (primaryVal !== moodFilterMood) return false;
    if (moodFilterRefine === "same") return otherVal !== null && otherVal === primaryVal;
    if (moodFilterRefine === "changed") return otherVal !== null && otherVal !== primaryVal;
    return true;
  };

  const getFilteredHistory = () => {
    const byDate = (!rangeFrom && !rangeTo) ? sortedHistory : sortedHistory.filter((h) => {
      const d = h.entryDate || localISODate(h.ts);
      if (rangeFrom && d < rangeFrom) return false;
      if (rangeTo && d > rangeTo) return false;
      return true;
    });
    return byDate.filter(passesMoodFilter);
  };
  const filtered = getFilteredHistory();

  const openDownloadDialog = () => { setDownloadDialogClosing(false); setDownloadDialogOpen(true); };
  const closeDownloadDialog = () => {
    setDownloadDialogClosing(true);
    setTimeout(() => { setDownloadDialogOpen(false); setDownloadDialogClosing(false); }, 180);
  };
  const toggleDownloadType = useCallback((type) => setDownloadTypes((prev) => ({ ...prev, [type]: !prev[type] })), []);

  const filterEntriesByTypes = (entries, types) => entries.filter((h) => {
    if (h.mode === "no_trade") return types.observation;
    if (h.mode === "past_trade") return types.trade;
    if (h.mode === "funds_added") return types.funds_added;
    if (h.mode === "funds_withdrawn") return types.funds_withdrawn;
    return types.trade;
  });

  const getLogRangeLabel = () => {
    const isAllTime = !rangeFrom && !rangeTo;
    let rangeLabel, datePart;
    if (isAllTime) { rangeLabel = "All time"; datePart = "alltime"; }
    else if (rangeFrom && rangeTo && rangeFrom !== rangeTo) { rangeLabel = `${rangeFrom} to ${rangeTo}`; datePart = `${rangeFrom}_to_${rangeTo}`; }
    else { const single = rangeFrom || rangeTo; rangeLabel = single; datePart = single; }

    const typeKeys = Object.keys(downloadTypes);
    const selectedTypes = typeKeys.filter((k) => downloadTypes[k]);
    const allTypesSelected = selectedTypes.length === typeKeys.length;

    let base;
    if (isAllTime && allTypesSelected) {
      base = `all_logs_${localISODate(Date.now())}`;
    } else if (selectedTypes.length === 1) {
      const nameMap = { observation: "observation", trade: "trade", funds_added: "funds_added", funds_withdrawn: "withdrawal" };
      base = `${nameMap[selectedTypes[0]] || "logs"}_log_${datePart}`;
    } else {
      base = `logs_${datePart}`;
    }
    return { rangeLabel, base };
  };

  const getScopedDownloadEntries = () => filterEntriesByTypes(filtered, downloadTypes).map(resolvePastTradeDisplay);

  const confirmDownload = () => {
    const scoped = getScopedDownloadEntries();
    const { rangeLabel, base } = getLogRangeLabel();
    const md = buildMarkdownFromHistory(scoped, rangeLabel, strategyLabelLookup);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${base}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeDownloadDialog();
    notify(`Trade Log downloaded — ${rangeLabel}.`);
  };

  const confirmDownloadPdf = async () => {
    const scoped = getScopedDownloadEntries();
    const { rangeLabel, base } = getLogRangeLabel();
    try {
      const doc = await buildLogsDetailPDF(scoped, rangeLabel, strategyLabelLookup);
      doc.save(`${base}.pdf`);
      closeDownloadDialog();
      notify(`Trade Log downloaded — ${rangeLabel}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  const getPnlExportScope = () => {
    if (pnlExportScope === "month") {
      return {
        scoped: pnlEntries.filter((e) => monthKeyOf(e.entryDate) === pnlExportMonth),
        scopeLabel: monthLabel(pnlExportMonth),
        base: `pnl-${pnlExportMonth}`,
      };
    }
    if (pnlExportScope === "year") {
      return {
        scoped: pnlEntries.filter((e) => (e.entryDate || "").slice(0, 4) === pnlExportYear),
        scopeLabel: pnlExportYear,
        base: `pnl-${pnlExportYear}`,
      };
    }
    if (pnlExportScope === "range") {
      const scoped = pnlEntries.filter((e) => {
        const d = e.entryDate || "";
        if (pnlExportRangeFrom && d < pnlExportRangeFrom) return false;
        if (pnlExportRangeTo && d > pnlExportRangeTo) return false;
        return true;
      });
      let scopeLabel, base;
      if (!pnlExportRangeFrom && !pnlExportRangeTo) { scopeLabel = "All time"; base = `pnl-all-${localISODate(Date.now())}`; }
      else if (pnlExportRangeFrom && pnlExportRangeTo && pnlExportRangeFrom !== pnlExportRangeTo) { scopeLabel = `${isoToShortDate(pnlExportRangeFrom)} to ${isoToShortDate(pnlExportRangeTo)}`; base = `pnl-${pnlExportRangeFrom}_to_${pnlExportRangeTo}`; }
      else { const single = pnlExportRangeFrom || pnlExportRangeTo; scopeLabel = isoToShortDate(single); base = `pnl-${single}`; }
      return { scoped, scopeLabel, base };
    }
    return { scoped: pnlEntries, scopeLabel: "All time", base: `pnl-all-${localISODate(Date.now())}` };
  };

  const downloadPnlMarkdown = (override) => {
    const { scoped, scopeLabel, base } = override || getPnlExportScope();
    const md = buildPnlMarkdown(scoped, scopeLabel, monthlyCharges, totalCapital);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${base}.md`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify(`P&L report downloaded — ${override ? scopeLabel : (pnlExportScope === "range" ? "from " : "") + scopeLabel}.`);
  };

  const viewPnlAsPdf = async (override) => {
    const { scoped, scopeLabel, base } = override || getPnlExportScope();
    try {
      const doc = await buildPnlDetailPDF(scoped, scopeLabel, monthlyCharges, totalCapital);
      doc.save(`${base}.pdf`);
      notify(`P&L report downloaded — ${override ? scopeLabel : (pnlExportScope === "range" ? "from " : "") + scopeLabel}.`);
    } catch (err) {
      notify("Couldn't generate the PDF — please try again.", "error");
    }
  };

  // --- My Learnings: notes + resources + folders CRUD ---
  // addNote/updateNote intentionally do NOT toast on every call — the main
  // note pane autosaves on every edit (see NoteMainPane), and a toast per
  // keystroke-debounce would be noise. Call sites that represent a single
  // explicit user action (the Resource dialog's Save button, moving a
  // note to a folder) toast for themselves after awaiting these.
  const addNote = async (payload) => {
    const sortOrder = Date.now() / 1000;
    const note = { id: freshNoteId(), folderId: null, ...payload, sortOrder };
    await dbTable.insert("notes", noteJsToRow(note, currentUserId));
    const full = { ...note, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    setLearningNotes((prev) => [full, ...prev]);
    return full;
  };
  const updateNote = async (id, payload) => {
    const existing = learningNotes.find((n) => n.id === id);
    const updated = { ...existing, ...payload, id };
    await dbTable.upsert("notes", noteJsToRow(updated, currentUserId));
    setLearningNotes((prev) => prev.map((n) => (n.id === id ? { ...updated, updatedAt: new Date().toISOString() } : n)));
  };
  // Removes a note from local state immediately without showing any
  // notification of its own — the actual DB delete + storage cleanup is
  // returned as performDelete for the caller to schedule, and restoreLocal
  // to undo it. Used directly by bulkDelete, which needs to combine many
  // notes into a single "N notes deleted" undo toast rather than firing
  // one per note; deleteNote below is the single-item public wrapper.
  const removeNoteOptimistic = (id) => {
    const note = learningNotes.find((n) => n.id === id);
    setLearningNotes((prev) => prev.filter((n) => n.id !== id));
    return {
      note,
      performDelete: async () => {
        try {
          await dbTable.deleteById("notes", id);
          if (note) deleteNoteStorageFiles(note.content);
        } catch (err) { /* best effort */ }
      },
      restoreLocal: () => { if (note) setLearningNotes((prev) => [...prev, note]); },
    };
  };
  const deleteNote = async (id, message) => {
    const { note, performDelete, restoreLocal } = removeNoteOptimistic(id);
    deleteWithUndo({
      message: message || `"${note ? (note.title || "Untitled") : "Untitled"}" deleted.`,
      performDelete,
      restoreLocal,
    });
    return true;
  };
  // Combines several notes' worth of removeNoteOptimistic into exactly one
  // undo toast — used for bulk selection, where showing one toast per note
  // deleted would be noisy and where a single "undo" should restore all of
  // them together, not just the last one.
  const bulkDeleteNotes = (ids) => {
    const entries = ids.map((id) => removeNoteOptimistic(id)).filter((e) => e.note);
    if (entries.length === 0) return;
    const message = entries.length === 1
      ? `"${entries[0].note.title || "Untitled"}" deleted.`
      : `${entries.length} notes deleted.`;
    deleteWithUndo({
      message,
      performDelete: async () => { await Promise.all(entries.map((e) => e.performDelete())); },
      restoreLocal: () => { entries.forEach((e) => e.restoreLocal()); },
    });
  };

  // Effective severity for a subcategory — a per-user override if one has
  // been set via Edit Categories, otherwise the built-in default. Never
  // touches the taxonomy itself, just how it's colored for this user.
  const reminderSeverityFor = (subcategory) => reminderSeverityOverrides[subcategory] || reminderBuiltInSeverity(subcategory);

  const setReminderCategorySeverity = async (subcategory, severity) => {
    const next = { ...reminderSeverityOverrides, [subcategory]: severity };
    setReminderSeverityOverrides(next);
    try { await dbStorage.set("reminder-severity-overrides", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  // The taxonomy actually shown in the app: built-in groups with any
  // user-hidden items removed, plus the user's own custom additions
  // appended to their group (or a new group, if it doesn't exist yet).
  // Severity always resolves through reminderSeverityFor, so an override
  // applies whether the type is built-in or custom.
  const reminderEffectiveGroups = useMemo(() => {
    const hidden = new Set(reminderHiddenSubcategories);
    const base = [...REMINDER_EVENT_GROUPS, ...REMINDER_TRADE_GROUPS].map((g) => ({ group: g.group, items: g.items.filter(([name]) => !hidden.has(name)) }));
    reminderCustomSubcategories.forEach(({ group, name }) => {
      let target = base.find((g) => g.group === group);
      if (!target) { target = { group, items: [] }; base.push(target); }
      target.items.push([name, reminderSeverityFor(name)]);
    });
    return base.filter((g) => g.items.length > 0);
  }, [reminderHiddenSubcategories, reminderCustomSubcategories, reminderSeverityOverrides]);

  const hideReminderSubcategory = async (name) => {
    const next = [...reminderHiddenSubcategories, name];
    setReminderHiddenSubcategories(next);
    try { await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const addCustomReminderSubcategory = async (group, name, severity) => {
    const next = [...reminderCustomSubcategories, { group, name, severity }];
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
    if (severity) await setReminderCategorySeverity(name, severity);
  };
  const removeCustomReminderSubcategory = async (name) => {
    const next = reminderCustomSubcategories.filter((c) => c.name !== name);
    setReminderCustomSubcategories(next);
    try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };

  const setReminderListWindow = async (days) => {
    setReminderListWindowDays(days);
    try { await dbStorage.set("reminder-list-window-days", String(days)); } catch (err) { /* best effort */ }
  };

  // Renaming a built-in item or group has no dedicated data model — it's
  // implemented by hiding the original name(s) and re-adding under the new
  // name(s) with the same severity, reusing the hide/custom-add mechanisms
  // that already exist. A rename of a custom (already user-added) item just
  // updates its entry directly rather than hide+re-add, since there's
  // nothing built-in to hide.
  const renameReminderItem = async (group, oldName, newName) => {
    if (!newName.trim() || newName === oldName) return;
    const isCustom = reminderCustomSubcategories.some((c) => c.name === oldName);
    const severity = reminderSeverityFor(oldName);
    if (isCustom) {
      const nextCustom = reminderCustomSubcategories.map((c) => (c.name === oldName ? { ...c, name: newName } : c));
      setReminderCustomSubcategories(nextCustom);
      try { await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom)); } catch (err) { /* best effort */ }
    } else {
      const nextHidden = [...reminderHiddenSubcategories, oldName];
      const nextCustom = [...reminderCustomSubcategories, { group, name: newName, severity }];
      setReminderHiddenSubcategories(nextHidden);
      setReminderCustomSubcategories(nextCustom);
      try {
        await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
        await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
      } catch (err) { /* best effort */ }
    }
    if (severity) await setReminderCategorySeverity(newName, severity);
  };

  const renameReminderGroup = async (oldGroup, newGroup, itemsInGroup) => {
    if (!newGroup.trim() || newGroup === oldGroup) return;
    const builtInNames = itemsInGroup.filter(([name]) => !reminderCustomSubcategories.some((c) => c.name === name)).map(([name]) => name);
    const nextHidden = [...reminderHiddenSubcategories, ...builtInNames];
    const nextCustom = [
      ...reminderCustomSubcategories.map((c) => (c.group === oldGroup ? { ...c, group: newGroup } : c)),
      ...itemsInGroup.filter(([name]) => builtInNames.includes(name)).map(([name, sev]) => ({ group: newGroup, name, severity: reminderSeverityFor(name) })),
    ];
    setReminderHiddenSubcategories(nextHidden);
    setReminderCustomSubcategories(nextCustom);
    try {
      await dbStorage.set("reminder-hidden-subcategories", JSON.stringify(nextHidden));
      await dbStorage.set("reminder-custom-subcategories", JSON.stringify(nextCustom));
    } catch (err) { /* best effort */ }
  };

  const addReminder = async (payload) => {
    const reminder = { id: freshReminderId(), leadDays: 0, ...payload };
    try {
      await dbTable.insert("reminders", reminderJsToRow(reminder, currentUserId));
      setReminders((prev) => [...prev, reminder]);
      notify(`Reminder added — ${reminder.title}.`);
      return reminder;
    } catch (err) {
      notify("Couldn't add the reminder — please try again.", "error");
      return null;
    }
  };
  const updateReminder = async (id, payload) => {
    const existing = reminders.find((r) => r.id === id);
    if (!existing) return;
    const updated = { ...existing, ...payload, id };
    try {
      await dbTable.upsert("reminders", reminderJsToRow(updated, currentUserId));
      setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      notify("Couldn't update the reminder — please try again.", "error");
    }
  };
  const deleteReminder = async (id) => {
    const targetIndex = reminders.findIndex((r) => r.id === id);
    const reminder = reminders[targetIndex];
    setReminders((prev) => prev.filter((r) => r.id !== id));
    deleteWithUndo({
      message: `Reminder deleted — ${reminder ? reminder.title : ""}.`,
      performDelete: async () => { try { await dbTable.deleteById("reminders", id); } catch (err) { /* best effort */ } },
      restoreLocal: () => { if (reminder) setReminders((prev) => { const next = [...prev]; next.splice(Math.min(targetIndex, next.length), 0, reminder); return next; }); },
    });
    return true;
  };

  const remindersWithDays = useMemo(() => {
    const todayIso = localISODate(Date.now());
    const [ty, tm, td] = todayIso.split("-").map(Number);
    const todayMs = new Date(ty, tm - 1, td).getTime();
    return reminders.map((r) => {
      if (!r.date) return { ...r, daysUntil: null };
      const [y, m, d] = r.date.split("-").map(Number);
      const daysUntil = Math.round((new Date(y, m - 1, d).getTime() - todayMs) / 86400000);
      return { ...r, daysUntil };
    }).sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
  }, [reminders]);

  // "Due" means today, or within its own lead time window (e.g. a reminder
  // set for 3 days before shows starting 3 days out and stays visible
  // through the day itself) — this is what the badge count and the
  // dashboard banner both key off.
  const dueReminders = useMemo(
    () => remindersWithDays.filter((r) => r.daysUntil !== null && r.daysUntil >= 0 && r.daysUntil <= (r.leadDays || 0)),
    [remindersWithDays]
  );

  // Periodic check: fires the alarm popup for any reminder whose exact
  // date+time has arrived and hasn't been dismissed for that specific
  // moment yet (rescheduling naturally clears an old dismissal, since the
  // new moment won't match what was recorded).
  useEffect(() => {
    if (!reminderAlarmDismissedLoaded) return; // avoid checking against a not-yet-loaded {} that would look like "nothing dismissed"
    const checkAlarms = () => {
      const now = Date.now();
      const due = remindersWithDays.filter((r) => {
        const epoch = reminderCombinedEpoch(r);
        if (epoch === null || epoch > now) return false;
        return reminderAlarmDismissed[r.id] !== epoch;
      });
      setDueAlarms(due);
    };
    checkAlarms();
    const interval = setInterval(checkAlarms, 20000);
    return () => clearInterval(interval);
  }, [remindersWithDays, reminderAlarmDismissed, reminderAlarmDismissedLoaded]);

  const persistAlarmDismissed = async (next) => {
    setReminderAlarmDismissed(next);
    try { await dbStorage.set("reminder-alarm-dismissed", JSON.stringify(next)); } catch (err) { /* best effort */ }
  };
  const dismissAlarm = (reminder) => {
    const epoch = reminderCombinedEpoch(reminder);
    persistAlarmDismissed({ ...reminderAlarmDismissed, [reminder.id]: epoch });
  };
  const handleAlarmClose = (reminder) => dismissAlarm(reminder);
  const handleAlarmCloseAll = () => {
    const next = { ...reminderAlarmDismissed };
    dueAlarms.forEach((r) => { next[r.id] = reminderCombinedEpoch(r); });
    persistAlarmDismissed(next);
  };
  const handleAlarmSnoozeMinutes = async (reminder, mins) => {
    const target = new Date(Date.now() + mins * 60000);
    const newDate = localISODate(target.getTime());
    const h24 = target.getHours();
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const newTime = `${h12}:${String(target.getMinutes()).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
    await updateReminder(reminder.id, { date: newDate, time: newTime });
    dismissAlarm(reminder);
  };
  const handleAlarmSnoozeAllMinutes = (mins) => { dueAlarms.forEach((r) => handleAlarmSnoozeMinutes(r, mins)); };
  const handleAlarmSaveDateTime = async (reminder, date, time) => {
    await updateReminder(reminder.id, { date, time });
    dismissAlarm(reminder);
  };
  const handleAlarmSaveDateTimeAll = (date, time) => { dueAlarms.forEach((r) => handleAlarmSaveDateTime(r, date, time)); };

  const moveNoteToFolder = async (noteId, folderId) => {
    try {
      await updateNote(noteId, { folderId: folderId || null });
    } catch (err) { /* best effort */ }
  };
  // A folder's full descendant set (its subfolders, their subfolders, etc.)
  // — used to keep a folder from being moved into itself or into one of its
  // own children, which would otherwise create an unreachable cycle.
  const folderDescendantIds = (folderId) => {
    const ids = new Set();
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && (f.parentId === folderId || ids.has(f.parentId)) && !ids.has(f.id)) { ids.add(f.id); grew = true; } });
    }
    return ids;
  };
  const moveFolderToFolder = async (folderId, newParentId, newSortOrder) => {
    if (newParentId === folderId || folderDescendantIds(folderId).has(newParentId)) {
      return;
    }
    const existing = noteFolders.find((f) => f.id === folderId);
    if (!existing) return;
    const updated = { ...existing, parentId: newParentId || null, sortOrder: typeof newSortOrder === "number" ? newSortOrder : existing.sortOrder };
    setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow(updated, currentUserId));
    } catch (err) {
      setNoteFolders((prev) => prev.map((f) => (f.id === folderId ? existing : f)));
    }
  };
  const duplicateNote = async (note) => {
    try {
      const copy = {
        title: note.title ? `${note.title} (copy)` : "",
        content: note.content || "",
        tags: note.tags || [],
        folderId: note.folderId || null,
        isResource: note.isResource || false,
        resourceUrl: note.resourceUrl || "",
        linkedTradeId: note.linkedTradeId || "",
        linkedUnderlying: note.linkedUnderlying || "",
        linkedStrategy: note.linkedStrategy || "",
        starred: note.starred || false,
      };
      const created = await addNote(copy);
      return created;
    } catch (err) {
      return null;
    }
  };
  const toggleNoteStarred = async (note) => {
    try {
      await updateNote(note.id, { starred: !note.starred });
    } catch (err) { /* best effort */ }
  };
  const noteLinkedTradeLabel = (note) => {
    if (!note.linkedTradeId) return null;
    const e = pnlEntries.find((x) => x.id === note.linkedTradeId);
    return e ? `${e.underlying || "—"} — ${e.strategyLabel || "Trade"} · ${fmtDateDMY(e.entryDate)}` : null;
  };
  const downloadNoteAsPdf = async (note) => {
    try {
      const doc = await buildNotePDF(note, noteLinkedTradeLabel(note));
      doc.save(`${slugify(note.title || "note")}.pdf`);
    } catch (err) { /* best effort */ }
  };

  // --- My Learnings: folders CRUD ---
  // Folders can be created (optionally nested) and renamed and deleted from
  // the UI. Reparenting an existing folder into a different parent isn't
  // exposed in this pass — only create-time nesting is — to keep the tree
  const addFolder = async (parentId = null) => {
    const folder = { id: freshFolderId(), name: "New Folder", parentId: parentId || null, sortOrder: Date.now() / 1000 };
    try {
      await dbTable.insert("note_folders", folderJsToRow(folder, currentUserId));
      const full = { ...folder, createdAt: new Date().toISOString() };
      setNoteFolders((prev) => [...prev, full]);
      return full;
    } catch (err) {
      return null;
    }
  };
  const renameFolder = async (id, name) => {
    const trimmed = (name || "").trim() || "Untitled Folder";
    const existing = noteFolders.find((f) => f.id === id);
    if (!existing) return;
    setNoteFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f)));
    try {
      await dbTable.upsert("note_folders", folderJsToRow({ ...existing, name: trimmed }, currentUserId));
    } catch (err) { /* best effort */ }
  };
  const deleteFolder = async (id) => {
    const folder = noteFolders.find((f) => f.id === id);
    // Mirror the DB's own cascade locally: deleting a folder deletes its
    // subfolders too (a subfolder is meaningless without its parent),
    // but every note that was inside any of them is unfiled, never deleted.
    const toRemove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      noteFolders.forEach((f) => { if (f.parentId && toRemove.has(f.parentId) && !toRemove.has(f.id)) { toRemove.add(f.id); grew = true; } });
    }
    const removedFolders = noteFolders.filter((f) => toRemove.has(f.id));
    const unfiledNotes = learningNotes.filter((n) => toRemove.has(n.folderId)).map((n) => ({ id: n.id, folderId: n.folderId }));

    setNoteFolders((prev) => prev.filter((f) => !toRemove.has(f.id)));
    setLearningNotes((prev) => prev.map((n) => (toRemove.has(n.folderId) ? { ...n, folderId: null } : n)));

    deleteWithUndo({
      message: `"${folder ? (folder.name || "Untitled Folder") : "Folder"}" deleted.`,
      performDelete: async () => {
        try { await Promise.all(removedFolders.map((f) => dbTable.deleteById("note_folders", f.id))); } catch (err) { /* best effort */ }
      },
      restoreLocal: () => {
        setNoteFolders((prev) => [...prev, ...removedFolders]);
        setLearningNotes((prev) => prev.map((n) => {
          const match = unfiledNotes.find((u) => u.id === n.id);
          return match ? { ...n, folderId: match.folderId } : n;
        }));
      },
    });
  };

  const setPresetToday = () => { const t = localISODate(Date.now()); setRangeFrom(t); setRangeTo(t); };
  const setPresetWeek = () => { const to = localISODate(Date.now()); const fd = new Date(); fd.setDate(fd.getDate() - 6); setRangeFrom(localISODate(fd.getTime())); setRangeTo(to); };
  const setPresetMonth = () => { const to = localISODate(Date.now()); const fd = new Date(); fd.setDate(fd.getDate() - 29); setRangeFrom(localISODate(fd.getTime())); setRangeTo(to); };
  const setPresetAll = () => { setRangeFrom(""); setRangeTo(""); };

  const activeRangePreset = useMemo(() => {
    const todayStr = localISODate(Date.now());
    if (rangeFrom === "" && rangeTo === "") return "all";
    if (rangeFrom === todayStr && rangeTo === todayStr) return "today";
    const wfd = new Date(); wfd.setDate(wfd.getDate() - 6);
    if (rangeFrom === localISODate(wfd.getTime()) && rangeTo === todayStr) return "week";
    const mfd = new Date(); mfd.setDate(mfd.getDate() - 29);
    if (rangeFrom === localISODate(mfd.getTime()) && rangeTo === todayStr) return "month";
    return null;
  }, [rangeFrom, rangeTo]);

  const statusColor = mode === "no_trade" ? "zinc" : readyToTrade ? "emerald" : missingCritical.length <= 2 ? "amber" : "rose";
  const statusColorMap = {
    emerald: { dot: "bg-emerald-400", glow: "bg-emerald-400", text: "text-emerald-600", ring: "ring-emerald-400/30", bar: "bg-emerald-400" },
    amber: { dot: "bg-amber-400", glow: "bg-amber-400", text: "text-amber-400", ring: "ring-amber-400/30", bar: "bg-amber-400" },
    rose: { dot: "bg-rose-400", glow: "bg-rose-400", text: "text-rose-600", ring: "ring-rose-400/30", bar: "bg-rose-400" },
    zinc: { dot: "bg-zinc-400", glow: "bg-zinc-400", text: "text-zinc-400", ring: "ring-zinc-600/30", bar: "bg-zinc-500" },
  };
  const sc = statusColorMap[statusColor];

  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  useEffect(() => {
    // html/body have no background of their own — only the inner .tj-app
    // div does. That's fine at rest, but during any animation that grows
    // the page's height (like expanding a collapsible section), the
    // browser can briefly show the page's true white default background
    // in the newly-expanding area before .tj-app's own background catches
    // up. Giving the real document background a matching color/gradient
    // removes that flash entirely, for any theme.
    document.body.style.background = th.bg;
    return () => { document.body.style.background = ""; };
  }, [th.bg]);

  const pageSize = 10;
  const totalHistoryPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(historyPage, totalHistoryPages);
  const pagedHistory = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  // Every one of these previously only gated a save-effect (preventing a
  // premature write before the real data arrived) with no visual feedback
  // at all — meaning the app would briefly flash defaults (₹0 capital,
  // sections snapping from collapsed to expanded, a blank profile name)
  // on every load before quietly correcting itself a moment later.
  const appDataReady = themeReady && !checklistOverridesLoading && !historyLoading && !pnlLoading &&
    !monthlyChargesLoading && !capitalBaseLoading && !fundTransactionsLoading &&
    !holidaysLoading && !profileLoading && !homePrefsLoading && !notesLoading && !foldersLoading;

  const tradeLogSection = (
          <div key="log" className="tj-fade space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-200" style={FONT_DISPLAY}>Trade Log</p>
              <button onClick={() => setTopTab("pnl")} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                <IconArrowLeft size={13} /> Back to Trade History
              </button>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-2.5">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>Download Logs</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => { setPresetToday(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "today" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Today</button>
                <button onClick={() => { setPresetWeek(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "week" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 7 days</button>
                <button onClick={() => { setPresetMonth(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "month" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Last 30 days</button>
                <button onClick={() => setLogRangeCustomOpen(true)} className={`text-xs px-2.5 py-1 rounded-full border ${logRangeCustomOpen ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>Select Dates</button>
                <button onClick={() => { setPresetAll(); setLogRangeCustomOpen(false); }} className={`text-xs px-2.5 py-1 rounded-full border ${!logRangeCustomOpen && activeRangePreset === "all" ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}>All time</button>
              </div>
              {logRangeCustomOpen && (
                <div className="flex flex-wrap items-end gap-2.5">
                  <label className="text-xs text-zinc-500">From
                    <div className="mt-1"><CalendarPicker value={rangeFrom} onChange={setRangeFrom} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                  <label className="text-xs text-zinc-500">To
                    <div className="mt-1"><CalendarPicker value={rangeTo} onChange={setRangeTo} maxDate={localISODate(Date.now())} holidays={holidays} highlightNonBusinessDays placeholder="Select date" /></div>
                  </label>
                </div>
              )}
              <button onClick={openDownloadDialog} disabled={filtered.length === 0} className="flex items-center gap-1.5 text-xs tj-primary-bg disabled:opacity-40 font-semibold rounded-lg px-3.5 py-2 hover:scale-[1.03] active:scale-95 transition-transform">
                <IconDownload size={12} /> Download
              </button>
              <p className="text-xs text-zinc-600">{filtered.length} {filtered.length === 1 ? "entry" : "entries"} in range</p>

              <div className="pt-2.5 border-t border-zinc-800 flex flex-wrap gap-2">
                <DropdownFilterButton
                  label="Mindset" active={!!moodFilterPoint}
                  displayValue={moodFilterPoint ? (moodFilterPoint === "entry" ? "Entry" : "Exit") : "All"}
                  options={[
                    { id: "all", label: "All", selected: !moodFilterPoint },
                    { id: "entry", label: "Entry", selected: moodFilterPoint === "entry" },
                    { id: "exit", label: "Exit", selected: moodFilterPoint === "exit" },
                  ]}
                  onSelect={(id) => {
                    setMoodFilterPoint(id === "all" ? null : id);
                    setMoodFilterMood(null);
                    setMoodFilterRefine(null);
                  }}
                />
                <DropdownFilterButton
                  label="Mood" active={!!moodFilterMood} disabled={!moodFilterPoint}
                  displayValue={moodFilterMood ? <span className="flex items-center gap-1"><MoodEmoji id={moodFilterMood} size={14} /> {moodMeta(moodFilterMood).label}</span> : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterMood },
                    ...MOOD_OPTIONS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji, selected: moodFilterMood === m.id })),
                  ]}
                  onSelect={(id) => { setMoodFilterMood(id === "any" ? null : id); setMoodFilterRefine(null); }}
                />
                <DropdownFilterButton
                  label="Compare" active={!!moodFilterRefine} disabled={!moodFilterPoint || !moodFilterMood}
                  displayValue={moodFilterRefine === "same" ? "Same Mood" : moodFilterRefine === "changed" ? "Mood Changed" : "Any"}
                  options={[
                    { id: "any", label: "Any", selected: !moodFilterRefine },
                    { id: "same", label: "Same Mood (Entry = Exit)", selected: moodFilterRefine === "same" },
                    { id: "changed", label: "Mood Changed (Entry ≠ Exit)", selected: moodFilterRefine === "changed" },
                  ]}
                  onSelect={(id) => setMoodFilterRefine(id === "any" ? null : id)}
                />
                {(moodFilterPoint || moodFilterMood || moodFilterRefine) && (
                  <button
                    type="button"
                    onClick={() => { setMoodFilterPoint(null); setMoodFilterMood(null); setMoodFilterRefine(null); }}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 px-2 transition-colors"
                  >
                    <IconX size={12} /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {historyLoading ? (
              <p className="text-xs text-zinc-500">Loading log...</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-zinc-500">No trades logged yet. Complete a check and save it to start the log.</p>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-2">
                {pagedHistory.map((h) => {
                  const displayH = h.pnlId ? resolvePastTradeDisplay(h) : h;
                  return (
                  <div key={h.ts} className={`flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/70 last:border-0 ${deletingHistoryTs === h.ts ? "tj-row-exit" : "tj-row-enter"}`}>
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-300 truncate">
                        {h.mode === "no_trade" ? "No-Trade Day" : h.mode === "past_trade" ? pastTradeTitle(displayH) : h.mode === "funds_added" ? `Funds Added${h.amount ? " — " + fmtINR(h.amount) : ""}` : h.mode === "funds_withdrawn" ? `Withdrawal${h.amount ? " — " + fmtINR(h.amount) : ""}` : `${h.underlying ? h.underlying + " — " : ""}${strategyLabelLookup(h.strategyType)}`}
                      </p>
                      <p className="text-xs text-zinc-600" style={FONT_MONO}>{h.dateLabel}{h.marketRead ? ` · ${h.marketRead}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {(h.entryMood || displayH.exitMood) && (
                        <Tooltip text={`${h.entryMood ? "Entry: " + moodMeta(h.entryMood).label : ""}${h.entryMood && displayH.exitMood ? " · " : ""}${displayH.exitMood ? "Exit: " + moodMeta(displayH.exitMood).label : ""}`}>
                          <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-full flex-shrink-0">
                            {h.entryMood && <MoodEmoji id={h.entryMood} size={16} />}
                            {h.entryMood && displayH.exitMood && <span className="text-zinc-600 text-[10px]">→</span>}
                            {displayH.exitMood && <MoodEmoji id={displayH.exitMood} size={16} />}
                          </span>
                        </Tooltip>
                      )}
                      {h.mode === "no_trade" || h.mode === "funds_added" || h.mode === "funds_withdrawn" || h.mode === "past_trade" || h.ready ? (
                        <span className={`text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full ${h.mode === "no_trade" ? "text-zinc-300 bg-zinc-700/30" : h.mode === "funds_added" ? "text-emerald-600 bg-emerald-400/10" : h.mode === "funds_withdrawn" ? "text-rose-600 bg-rose-400/10" : "text-emerald-600 bg-emerald-400/10"}`} style={FONT_MONO}>
                          {h.mode === "no_trade" ? "Observation" : h.mode === "funds_added" ? "Funds Added" : h.mode === "funds_withdrawn" ? "Withdrawal" : "Trade"}
                        </span>
                      ) : null}
                      <Tooltip text="Download">
                        <button onClick={() => setEntryDownloadFor(h)} className="text-zinc-600 hover:tj-primary-text flex-shrink-0 hover:scale-110 transition-transform">
                          <IconDownload size={14} />
                        </button>
                      </Tooltip>
                      {pendingDeleteTs === h.ts ? (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => confirmDeleteEntry(h.ts)} disabled={deletingHistoryTs === h.ts} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 disabled:opacity-50 px-2 py-1 rounded">Confirm</button>
                          <button onClick={() => setPendingDeleteTs(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                        </span>
                      ) : (
                        <Tooltip text="Delete entry">
                          <button onClick={() => setPendingDeleteTs(h.ts)} className="text-zinc-600 hover:text-rose-600 flex-shrink-0">
                            <IconTrash size={14} />
                          </button>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  );
                })}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <button onClick={() => setHistoryPage((p) => Math.max(1, p - 1))} disabled={clampedPage <= 1} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      <IconChevronLeft size={14} /> Prev
                    </button>
                    <span className="text-xs text-zinc-500" style={FONT_MONO}>Page {clampedPage} of {totalHistoryPages}</span>
                    <button onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))} disabled={clampedPage >= totalHistoryPages} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:hover:text-zinc-400 px-2 py-1">
                      Next <IconChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
  );

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode}`}
      style={{
        "--tj-primary": th.primary,
        "--tj-primary-contrast": th.primaryContrast,
        "--tj-secondary": th.secondary,
        "--tj-accent": th.accent,
        "--tj-bg": th.bg,
        "--tj-panel": th.panel,
        "--tj-panel2": th.panel2,
        "--tj-panel-solid": th.panelSolid || th.panel2,
        "--tj-border": th.border,
        "--tj-border-soft": th.borderSoft,
        "--tj-text1": th.text1,
        "--tj-text2": th.text2,
        "--tj-text3": th.text3,
        "--tj-text4": th.text4,
        "--tj-text5": th.text5,
        "--tj-radius-sm": th.radiusSm,
        "--tj-radius-md": th.radiusMd,
        "--tj-radius-lg": th.radiusLg,
        "--tj-shadow": th.shadow,
        "--tj-dur": th.transDur,
        "--tj-ease": th.transEase,
        "--tj-font-display": th.fontDisplay,
        "--tj-font-body": th.fontBody,
        "--tj-blur": th.blur,
        background: th.bg,
        color: th.text1,
        fontFamily: th.fontBody,
        minHeight: "100vh",
        position: "relative",
      }}
    >
      <style>{themeGlobalCss(th)}</style>
      {th.id === "crt" && <div className="tj-app-bg-overlay"></div>}
      <style>{THEME_PRIMARY_CSS}</style>
      {!appDataReady ? (
        <AppLoadingScreen />
      ) : (
        <>
      <ToastStack />
      <div
        ref={navRef}
        className="tj-navbar sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 relative transition-transform duration-300 ease-out"
        style={{ willChange: "transform", transform: navHidden ? "translateY(-100%)" : "translateY(0)" }}
      >
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-3.5">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button onClick={() => setTopTab("home")} className="tj-logo-btn flex items-center flex-shrink-0" aria-label="Comet Trading Journal — Dashboard">
              <img src={logo} alt="Comet Trading Journal" className="h-12 w-auto transition-transform duration-150" />
            </button>

            <div className="flex items-center justify-center overflow-x-auto no-scrollbar py-3 -my-1.5 min-w-0">
              {[
                { id: "home", label: "Dashboard", icon: IconLayoutDashboard },
                { id: "checklist", label: "Checklist", icon: IconChecklist },
                { id: "setup", label: "Trade Setup", icon: IconAdjustmentsHorizontal, animated: true },
                { id: "pnl", label: "Trade History", icon: IconCurrencyRupee },
                { id: "learn", label: "My Learnings", icon: IconBulb, last: true },
              ].map((t) => {
                const visible = t.id !== "setup" || mode === "trade";
                const tabButton = (
                  <button
                    key={t.id}
                    onClick={() => setTopTab(t.id)}
                    className={`flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-2.5 sm:px-3.5 py-2 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap ${
                      topTab === t.id ? "tj-primary-bg" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <t.icon size={15} className="flex-shrink-0" />
                    <span className="hidden md:inline">{t.label}</span>
                  </button>
                );
                if (!t.animated) return <div key={t.id} className={`flex-shrink-0 ${t.last ? "" : "mr-2"}`}>{tabButton}</div>;
                return (
                  <div
                    key={t.id}
                    className="flex-shrink-0"
                    style={{
                      transition: "max-width 750ms ease-out, opacity 750ms ease-out, transform 750ms ease-out, margin-right 750ms ease-out",
                      maxWidth: visible ? "220px" : "0px",
                      marginRight: visible ? "8px" : "0px",
                      opacity: visible ? 1 : 0,
                      transform: visible ? "scale(1)" : "scale(0.6)",
                      overflow: visible ? "visible" : "hidden",
                    }}
                  >
                    {tabButton}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {baseTh.alt && (
                <Tooltip text={effectiveMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                  <button
                    onClick={() => setColorMode(effectiveMode === "dark" ? "light" : "dark")}
                    className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 flex items-center justify-center tj-primary-text hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
                  >
                    {effectiveMode === "dark" ? <IconSun size={14} /> : <IconMoon size={14} />}
                  </button>
                </Tooltip>
              )}
              <NotificationBell />
              <Tooltip text="Profile">
                <button
                  ref={avatarBtnRef}
                  onClick={() => {
                    if (!avatarMenuOpen && avatarBtnRef.current) {
                      const rect = avatarBtnRef.current.getBoundingClientRect();
                      setAvatarMenuCoords({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setAvatarMenuOpen((v) => !v);
                  }}
                  className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/80 overflow-hidden flex items-center justify-center flex-shrink-0 hover:scale-110 hover:border-zinc-600 active:scale-95 transition-transform"
                >
                  {userProfile.avatarType === "custom" && userProfile.avatarValue ? (
                    <img src={userProfile.avatarValue} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarSVG preset={DEFAULT_AVATAR} size={32} animate={false} />
                  )}
                </button>
              </Tooltip>
            </div>
          </div>

          {avatarMenuOpen && avatarMenuCoords && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => setAvatarMenuOpen(false)} />
              <div
                className="tj-popover fixed z-[9999] w-56 rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-2 space-y-1"
                style={{ top: avatarMenuCoords.top, right: avatarMenuCoords.right }}
              >
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("profile"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconSettings size={15} className="text-zinc-500 flex-shrink-0" /> Settings
                </button>
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" ? previousTopTab : topTab); setTopTab("holidays"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconFlag size={15} className="text-zinc-500 flex-shrink-0" /> Holiday Calendar
                </button>
                <button
                  onClick={() => { setPreviousTopTab(topTab === "profile" || topTab === "holidays" || topTab === "docs" ? previousTopTab : topTab); setTopTab("docs"); setAvatarMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 text-sm text-zinc-200 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconBook size={15} className="text-zinc-500 flex-shrink-0" /> Docs
                </button>
                <div className="h-px bg-zinc-800 my-1"></div>
                <button
                  onClick={() => { setAvatarMenuOpen(false); sessionStorage.removeItem("tj-pin-unlocked"); supabase.auth.signOut(); }}
                  className="w-full flex items-center gap-2.5 text-sm text-rose-400 hover:bg-zinc-800 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <IconLock size={15} className="flex-shrink-0" /> Sign Out
                </button>
              </div>
            </>,
            getPortalTarget()
          )}
        </div>
      </div>

      {topTab !== "learn" && (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 space-y-7">
        {deletionCancelledNotice && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-800 bg-emerald-950/30 px-4 py-3">
            <p className="text-sm text-emerald-500">Welcome back — your account deletion request has been cancelled. Your data is safe.</p>
            <button onClick={onDismissDeletionNotice} className="text-emerald-600 hover:text-emerald-400 flex-shrink-0">
              <IconX size={16} />
            </button>
          </div>
        )}
        {(topTab === "profile" || topTab === "holidays" || topTab === "reminders" || topTab === "docs") && (
          <button
            onClick={() => setTopTab(previousTopTab)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <IconChevronLeft size={16} /> Back
          </button>
        )}

        {topTab === "home" && (
          <div key="home" className="tj-fade">
            <HomePage
              userProfile={userProfile} totalCapital={totalCapital} pnlEntries={pnlEntries} history={history}
              journeyOpen={journeyOpen} setJourneyOpen={setJourneyOpen} deepDiveOpen={deepDiveOpen} setDeepDiveOpen={setDeepDiveOpen}
              dueReminders={dueReminders} onOpenReminders={() => { setPreviousTopTab(topTab); setTopTab("reminders"); }}
            />
          </div>
        )}

        {topTab === "reminders" && (
          <div key="reminders" className="tj-fade">
            <RemindersPage
              remindersWithDays={remindersWithDays}
              onDeleteReminder={deleteReminder}
              onAddClick={() => { setReminderPrefill(null); setTopTab("addReminder"); }}
              onSettingsClick={() => setTopTab("reminderSettings")}
              pnlEntries={pnlEntries}
              holidays={holidays}
              onOpenTrade={openTradeFromReminder}
              onCreateAt={createReminderAt}
              windowDays={reminderListWindowDays}
              onEdit={(reminder) => { setReschedulingReminder(reminder); setTopTab("rescheduleReminder"); }}
            />
          </div>
        )}

        {topTab === "addReminder" && (
          <div key="addReminder" className="tj-fade">
            <AddReminderPage
              onBack={() => { setReminderPrefill(null); setTopTab("reminders"); }}
              onSave={async (payload) => { const r = await addReminder(payload); if (r) { setReminderPrefill(null); setTopTab("reminders"); } }}
              effectiveGroups={reminderEffectiveGroups}
              reminderSeverityFor={reminderSeverityFor}
              prefill={reminderPrefill}
            />
          </div>
        )}

        {topTab === "rescheduleReminder" && reschedulingReminder && (
          <div key="rescheduleReminder" className="tj-fade">
            <RescheduleReminderPage
              reminder={reschedulingReminder}
              onBack={() => { setReschedulingReminder(null); setTopTab("reminders"); }}
              onSave={async (id, payload) => { await updateReminder(id, payload); notify(`Reminder rescheduled — ${reschedulingReminder.title}.`); setReschedulingReminder(null); setTopTab("reminders"); }}
            />
          </div>
        )}

        {topTab === "reminderSettings" && (
          <div key="reminderSettings" className="tj-fade">
            <RemindersSettingsPage
              onBack={() => setTopTab("reminders")}
              onEditWindowClick={() => setTopTab("reminderWindowSettings")}
              onEditCategoriesClick={() => setTopTab("editCategories")}
            />
          </div>
        )}

        {topTab === "reminderWindowSettings" && (
          <div key="reminderWindowSettings" className="tj-fade">
            <ReminderWindowSettingsPage
              onBack={() => setTopTab("reminderSettings")}
              windowDays={reminderListWindowDays}
              onChangeWindow={setReminderListWindow}
            />
          </div>
        )}

        {topTab === "editCategories" && (
          <div key="editCategories" className="tj-fade">
            <EditCategoriesPage
              onBack={() => setTopTab("reminderSettings")}
              effectiveGroups={reminderEffectiveGroups}
              reminderSeverityFor={reminderSeverityFor}
              onChangeSeverity={setReminderCategorySeverity}
              onHide={hideReminderSubcategory}
              customNames={reminderCustomSubcategories.map((c) => c.name)}
              onRemoveCustom={removeCustomReminderSubcategory}
              onAddCustom={addCustomReminderSubcategory}
              onRenameItem={renameReminderItem}
              onRenameGroup={renameReminderGroup}
            />
          </div>
        )}

        {topTab === "profile" && (
          <div key="profile" className="tj-fade">
            <SettingsPage
              profile={userProfile} onSaveProfile={saveProfile} onClearData={clearSelectedData} onDownloadBackup={downloadFullBackup} hasCustomStrategies={customStrategies.length > 0} themeId={themeId} onSaveTheme={setThemeId}
              pinRecord={pinRecord} onPinChanged={onPinChanged} onDeleteAccount={deleteMyAccount}
              securityQuestions={securityQuestions} onSecurityQuestionsChanged={onSecurityQuestionsChanged}
            />
          </div>
        )}

        {topTab === "holidays" && (
          <div key="holidays" className="tj-fade">
            <HolidayCalendarPage holidays={holidays} onSave={saveHoliday} onDelete={deleteHoliday} isAdmin={isAdminSession(session)} />
          </div>
        )}

        {topTab === "docs" && (
          <div key="docs" className="tj-fade">
            <DocsPage />
          </div>
        )}

        {topTab === "setup" && mode === "trade" && (
          <div key="setup" className="tj-fade space-y-7">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Strategy</p>
              <div className="flex flex-wrap gap-2 mb-2.5">
                {STRATEGY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setStrategyCategory(cat.id);
                      const opts = allStrategies.filter((s) => (s.category || "other") === cat.id);
                      if (opts.length > 0 && !opts.some((s) => s.id === strategyType)) setStrategyType(opts[0].id);
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-full border ${strategyCategory === cat.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <select
                value={strategyType}
                onChange={(e) => setStrategyType(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="" disabled>{strategyCategory ? "Select a strategy" : "Pick an outlook above first"}</option>
                {strategiesInCategory.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <button onClick={() => setShowAddStrategy(true)} className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform">
                  <IconPlus size={13} /> Add your own strategy
                </button>
                {customStrategies.length > 0 && (
                  <button onClick={() => setShowManageStrategies((v) => !v)} className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 tj-primary-text font-semibold rounded-lg px-2.5 py-1 hover:scale-105 active:scale-95 transition-transform">
                    <IconSettings2 size={13} /> Manage your strategies
                  </button>
                )}
              </div>

              {showAddStrategy && (
                <CustomStrategyDialog
                  initial={{ category: strategyCategory }}
                  isEdit={false}
                  onSave={addCustomStrategy}
                  onClose={() => setShowAddStrategy(false)}
                />
              )}

              {showManageStrategies && customStrategies.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-zinc-500">Your custom strategies</p>
                  {customStrategies.map((s) => (
                    <div key={s.id}>
                      {editingStratId === s.id && (
                        <CustomStrategyDialog
                          initial={{ label: s.label, category: s.category || "other", profile: s.profile, legTemplate: s.legTemplate }}
                          isEdit={true}
                          onSave={(values) => { editCustomStrategy(s.id, values); setEditingStratId(null); }}
                          onClose={() => setEditingStratId(null)}
                        />
                      )}
                      <div className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs text-zinc-200 truncate">{s.label}</p>
                          <p className="text-[10px] text-zinc-600">{(STRATEGY_CATEGORIES.find((c) => c.id === (s.category || "other")) || {}).label || "Other"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Tooltip text="Edit">
                            <button onClick={() => setEditingStratId(s.id)} className="text-zinc-500 hover:text-zinc-200">
                              <IconPencil size={13} />
                            </button>
                          </Tooltip>
                          {pendingDeleteStratId === s.id ? (
                            <span className="flex items-center gap-1">
                              <button onClick={() => { deleteCustomStrategy(s.id); setPendingDeleteStratId(null); }} className="text-[10px] font-semibold text-rose-950 bg-rose-400 hover:bg-rose-300 px-2 py-1 rounded">Confirm</button>
                              <button onClick={() => setPendingDeleteStratId(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-1">Cancel</button>
                            </span>
                          ) : (
                            <Tooltip text="Delete">
                              <button onClick={() => setPendingDeleteStratId(s.id)} className="text-zinc-500 hover:text-rose-600">
                                <IconTrash size={13} />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <LegsCard underlying={underlying} onUnderlyingChange={setUnderlying} legs={legs} onAdd={addLeg} onRemove={removeLeg} onUpdate={updateLeg} netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays} />

            <DaysToExpiryWidget profile={profile} strategyLabel={currentStrategy ? currentStrategy.label : "your strategy"} legs={legs} underlying={underlying} />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2" style={FONT_MONO}>
                  <IconCalculator size={13} /> Risk Calculator
                </p>
                {editingTargetRisk ? (
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={targetRiskDraft} autoFocus
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setTargetRiskDraft(""); return; }
                          setTargetRiskDraft(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 2"
                        className="w-16 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => { const v = parseFloat(targetRiskDraft); if (v > 0) saveTargetRiskPct(v); setEditingTargetRisk(false); }}
                      disabled={!(parseFloat(targetRiskDraft) > 0)}
                      className="text-xs px-2.5 py-1 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Save
                    </button>
                    <Tooltip text="Cancel">
                      <button onClick={() => setEditingTargetRisk(false)} className="text-zinc-500 hover:text-zinc-300"><IconX size={14} /></button>
                    </Tooltip>
                  </div>
                ) : (
                  <Tooltip text="Set your target risk percentage">
                    <button
                      onClick={() => { setTargetRiskDraft(String(targetRiskPct)); setEditingTargetRisk(true); }}
                      className="flex items-center gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <IconTarget size={11} /> Target: {targetRiskPct}%
                    </button>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 items-stretch">
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Total capital (₹) <span className="text-zinc-600">— defaults from P/L statement, editable here for a separate amount</span></span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 300000" value={capital} onChange={(e) => setCapital(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
                <label className="flex flex-col">
                  <span className="text-xs text-zinc-500">Planned max loss (₹)</span>
                  <input type="text" inputMode="numeric" placeholder="e.g. 6800" value={plannedLoss} onChange={(e) => setPlannedLoss(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="mt-auto pt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400" style={FONT_MONO} />
                </label>
              </div>
              <div className="mt-3.5 flex items-center justify-between flex-wrap gap-2">
                <span className={`text-sm font-semibold ${pctColor}`} style={FONT_MONO}>
                  {pct === null ? "—" : `${pct.toFixed(2)}%`} <span className="font-normal text-zinc-500">of capital</span>
                </span>
                <span className={`text-xs ${pctColor}`}>{pctVerdict}</span>
              </div>
              <div className="mt-3.5 pt-3.5 border-t border-zinc-800 space-y-2">
                <p className="text-xs text-zinc-500">Set planned max loss as % of capital</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => applyRiskPct(1)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 1 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>1% · {fmtINR(capNum * 0.01)}</button>
                  <button onClick={() => applyRiskPct(2)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 2 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>2% · {fmtINR(capNum * 0.02)}</button>
                  <button onClick={() => applyRiskPct(3)} disabled={!capNum} className={`text-xs px-3 py-1.5 rounded-full border disabled:opacity-40 ${activeRiskPct === 3 ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"}`} style={FONT_MONO}>3% · {fmtINR(capNum * 0.03)}</button>
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <input
                        type="text" inputMode="decimal" value={customRiskPct}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "");
                          const num = parseFloat(raw);
                          if (raw === "") { setCustomRiskPct(""); return; }
                          setCustomRiskPct(!Number.isNaN(num) && num > 20 ? "20" : raw);
                        }}
                        placeholder="e.g. 1.5"
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-lg pl-2 pr-5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 text-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        style={FONT_MONO}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500" style={FONT_MONO}>%</span>
                    </div>
                    <button
                      onClick={() => applyRiskPct(parseFloat(customRiskPct) || 0)}
                      disabled={!capNum || !customRiskPct}
                      className="text-xs px-3 py-1.5 rounded-full tj-primary-bg disabled:opacity-40 font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-zinc-600">Max 20%.</p>
              </div>
            </div>
          </div>
        )}

        {topTab === "checklist" && (
          <div key="checklist" className="tj-fade space-y-7">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500" style={FONT_MONO}>
                {checklistManagerOpen ? "Manage Checklist" : "Pre-Trade Checklist"}
              </p>
              {!checklistManagerOpen && (
                <div className="flex items-center gap-1 bg-zinc-950/60 border border-zinc-800 rounded-full p-1 text-sm">
                  <button onClick={() => handleModeToggle("trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "trade" ? "tj-primary-bg font-semibold" : "text-zinc-400"}`}>Trade Day</button>
                  <button onClick={() => handleModeToggle("no_trade")} className={`px-4 py-2 rounded-full transition-colors ${mode === "no_trade" ? "bg-zinc-200 text-zinc-950 font-semibold" : "text-zinc-400"}`}>No-Trade Day</button>
                </div>
              )}
            </div>

            {!checklistManagerOpen && (
              <CollapsibleRegion open={mode === "trade"} animated={region2Animated} duration={750}>
                <div className="space-y-4 p-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className={`inline-flex items-center gap-2.5 pl-3 pr-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 ring-1 ${sc.ring}`}>
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        {!readyToTrade && <span className={`animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full ${sc.glow} opacity-60`}></span>}
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${sc.dot}`}></span>
                      </span>
                      <span className={`text-xs font-bold tracking-wide ${sc.text}`} style={FONT_MONO}>
                        {readyToTrade ? "ARMED" : `${missingCritical.length} CRITICAL CHECKS PENDING`}
                      </span>
                    </div>
                    <button
                      onClick={() => setChecklistManagerOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform flex-shrink-0"
                    >
                      <IconSettings2 size={13} /> Manage Checklist
                    </button>
                  </div>
                  <div>
                    <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full ${sc.bar} rounded-full transition-all duration-300`} style={{ width: `${progressPct}%` }}></div>
                    </div>
                    <div className="mt-4 mb-4">
                      <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} />
                    </div>
                  </div>
                </div>
              </CollapsibleRegion>
            )}

            {checklistManagerOpen && (
              <div className="flex items-center justify-end">
                <button
                  onClick={() => setChecklistManagerOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs tj-primary-text font-semibold hover:scale-105 active:scale-95 transition-transform"
                >
                  <IconSettings2 size={13} /> Back to Checklist
                </button>
              </div>
            )}

            {checklistManagerOpen ? (
              <ChecklistManagerTab
                sections={sections}
                onAddItem={addChecklistItem}
                onEditItem={editChecklistItem}
                onDeleteItem={deleteChecklistItem}
                onAddSection={addChecklistSection}
                onDeleteSection={deleteChecklistSection}
                onEditSection={editChecklistSectionTitle}
              />
            ) : (
              <div key={activeTab} className={activeTab === "data" && contentUsesSpecialSlide ? "" : "tj-slide-in"}>
                {activeTab === "data" ? (
                  <DataInterpretationSection dataReads={dataReads} onSetRow={setDataRow} avg={marketAvg} verdict={marketVerdict} staggerIn={contentUsesSpecialSlide} />
                ) : activeSection ? (
                  <ChecklistTabPanel section={activeSection} profile={profile} strategyId={strategyType} checked={checked} onToggle={toggleItem} onToggleAll={toggleAllInSection} />
                ) : null}
              </div>
            )}
          </div>
        )}

        {topTab === "pnl" && (
          <div key="pnl" className="tj-fade">
          <PnlTab
            pnlEntries={pnlEntries} pnlLoading={pnlLoading}
            selectedMonthKey={selectedMonthKey} setSelectedMonthKey={setSelectedMonthKey}
            onUpdate={updatePnlEntry} pendingDeleteId={pnlPendingDeleteId} setPendingDeleteId={setPnlPendingDeleteId} onDelete={confirmDeletePnlEntry} onSilentDelete={(id) => deletePnlEntry(id, true)} deletingId={deletingPnlId}
            onAddPast={openAddTradeDialog}
            monthlyCharges={monthlyCharges} onSetMonthlyCharge={setMonthlyCharge}
            exportScope={pnlExportScope} setExportScope={setPnlExportScope}
            exportMonth={pnlExportMonth} setExportMonth={setPnlExportMonth}
            exportYear={pnlExportYear} setExportYear={setPnlExportYear}
            exportRangeFrom={pnlExportRangeFrom} setExportRangeFrom={setPnlExportRangeFrom}
            exportRangeTo={pnlExportRangeTo} setExportRangeTo={setPnlExportRangeTo}
            onDownload={downloadPnlMarkdown}
            onViewPdf={viewPnlAsPdf}
            totalCapital={totalCapital}
            onManageFunds={() => setManageFundsDialogOpen(true)}
            onRecordChange={recordTradeChange}
            notesByTradeId={notesByTradeId}
            onOpenNote={openNoteFromTrade}
            pendingRevealTradeId={pendingRevealTradeId}
            onPendingRevealApplied={() => setPendingRevealTradeId(null)}
            allStrategies={allStrategies}
            customStrategies={customStrategies}
            autoEditRowId={newTradeIdToEdit}
            onAutoEditApplied={() => setNewTradeIdToEdit(null)}
            holidays={holidays}
            onOpenTradeLog={() => setTopTab("log")}
            noteTemplates={noteTemplates}
          />
          </div>
        )}

        {topTab === "log" && tradeLogSection}

        {topTab !== "pnl" && topTab !== "log" && topTab !== "learn" && topTab !== "profile" && topTab !== "holidays" && topTab !== "home" && (
          <>
            {topTab === "checklist" && mode === "trade" && !readyToTrade && missingCritical.length > 0 && (
              <div className="tj-fade rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-5">
                <p className="flex items-center gap-2 text-sm font-bold text-rose-300 mb-3">
                  <IconAlertTriangle size={16} /> Not armed yet — {missingCritical.length} critical {missingCritical.length === 1 ? "check" : "checks"} left
                </p>
                <div className="space-y-2">
                  {missingCritical.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => { setTopTab("checklist"); setActiveTab(itemToSection[i.id]); }}
                      className="w-full flex items-center gap-2.5 text-left text-sm text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg px-3.5 py-2.5 transition-colors"
                    >
                      <IconFlag size={13} className="text-rose-600 flex-shrink-0" />
                      {i.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {topTab === "checklist" && mode === "trade" && (
              <div className="flex flex-col items-center gap-2 pt-2 pb-1">
                <button
                  onClick={() => setTopTab("setup")}
                  disabled={!readyToTrade}
                  className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-6 py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <IconAdjustmentsHorizontal size={15} /> Continue to Trade Setup
                </button>
                {!readyToTrade && <p className="text-xs text-zinc-600">Finish the critical checks above to continue.</p>}
              </div>
            )}

            {(topTab === "setup" || (topTab === "checklist" && mode === "no_trade")) && (
              <>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Notes — directional view & reasoning</p>
                  <ExpandableNoteField
                    value={notes}
                    onChange={setNotes}
                    placeholder="What's the read today, and why? Write it before checking the chain."
                    label="Notes — directional view & reasoning"
                    variant="block"
                    templates={noteTemplates}
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>Chart screenshots</p>
                  <div className="flex items-center gap-2">
                    <TradeScreenshotsButton screenshots={screenshots} onChange={setScreenshots} tradeLabel={underlying || "this trade"} />
                    <p className="text-xs text-zinc-600">{screenshots.length ? `${screenshots.length} attached` : "Attach the setup you're looking at"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setEntryMood((prev) => (prev === m.id ? null : m.id))}
                        className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                          entryMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <MoodEmoji id={m.id} size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    {entryMoodNoteOpen ? (
                      <div className="space-y-2">
                        <input
                          type="text" value={entryMoodNoteDraft} onChange={(e) => setEntryMoodNoteDraft(e.target.value)} autoFocus
                          placeholder="What triggered this?"
                          className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => { setEntryMoodNote(entryMoodNoteDraft); setEntryMoodNoteOpen(false); }} className="flex items-center gap-1 text-xs tj-primary-bg font-semibold px-3 py-1.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform">
                            <IconDeviceFloppy size={12} /> Save
                          </button>
                          <button type="button" onClick={() => setEntryMoodNoteOpen(false)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setEntryMoodNoteDraft(entryMoodNote); setEntryMoodNoteOpen(true); }} className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-dotted">
                        {entryMoodNote ? "Edit note on what triggered this" : "+ Add a note on what triggered this"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={handleSaveClick} disabled={saveStatus === "saving" || (mode === "trade" && (!currentStrategy || !underlying.trim() || !legsComplete))} className="flex items-center gap-2 tj-primary-bg font-semibold text-sm px-5 py-3 rounded-xl disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98] transition-transform">
                    <IconDeviceFloppy size={15} />
                    {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Couldn't save — retry" : mode === "no_trade" ? "Save Market Read" : "Save This Check"}
                  </button>
                  <button onClick={startNewCheck} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
                    <IconRotate size={15} /> {mode === "no_trade" ? "Clear Notes" : "Start New Trade Check"}
                  </button>
                  {mode === "trade" && !currentStrategy && <span className="text-xs text-amber-400">Pick a strategy above before saving.</span>}
                  {mode === "trade" && currentStrategy && !underlying.trim() && <span className="text-xs text-amber-400">Enter the underlying above before saving.</span>}
                  {mode === "trade" && currentStrategy && underlying.trim() && !legsComplete && <span className="text-xs text-amber-400">Fill in every field on each leg before saving.</span>}
                </div>
              </>
            )}

          </>
        )}


      </div>
      )}

      {topTab === "learn" && (
        <div className="max-w-[1600px] mx-auto">
          <MyLearningsTab
            notes={learningNotes}
            notesLoading={notesLoading}
            folders={noteFolders}
            onAdd={addNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onBulkDeleteNotes={bulkDeleteNotes}
            onMoveNote={moveNoteToFolder}
            onAddFolder={addFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveFolder={moveFolderToFolder}
            onDuplicateNote={duplicateNote}
            onToggleStar={toggleNoteStarred}
            pnlEntries={pnlEntries}
            onDownloadPdf={downloadNoteAsPdf}
            navHeight={navHeight}
            pendingOpenNoteId={pendingOpenNoteId}
            onPendingOpenNoteApplied={() => setPendingOpenNoteId(null)}
          />
        </div>
      )}

      {manageFundsDialogOpen && (
        <ManageFundsDialog
          currentCapital={capitalBase}
          onAddFunds={(amt, date, notes) => addFundTransaction("deposit", amt, date, notes)}
          onWithdrawFunds={(amt, date, notes) => addFundTransaction("withdrawal", amt, date, notes)}
          onClose={() => setManageFundsDialogOpen(false)}
        />
      )}

      {incompleteChecklistDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade" onClick={() => setIncompleteChecklistDialogOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-amber-900 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <IconAlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-400" style={FONT_DISPLAY}>Checklist not complete</p>
            </div>
            <p className="text-xs text-zinc-400">
              You haven't finished the pre-trade checklist yet ({missingCritical.length} item{missingCritical.length === 1 ? "" : "s"} pending). Do you want to proceed and save anyway, or go fill it in first?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setIncompleteChecklistDialogOpen(false); saveCheck(); }}
                className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Proceed and Save Anyway
              </button>
              <button
                onClick={() => { setIncompleteChecklistDialogOpen(false); setTopTab("checklist"); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                Take Me to the Checklist
              </button>
            </div>
          </div>
        </div>
      )}

      {addTradeDialogOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${addTradeDialogClosing ? "tj-backdrop-out" : "tj-fade"}`}
          onClick={addTradeMoodStepTs ? undefined : closeAddTradeDialog}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${addTradeDialogClosing ? "tj-dialog-out" : "tj-popover"}`}
            onClick={(e) => e.stopPropagation()}
          >
            {addTradeMoodStepTs ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Trade Added</p>
                  <button onClick={skipAddTradeMood} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2" style={FONT_MONO}>How are you feeling right now?</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setAddTradeSelectedMood((prev) => (prev === m.id ? null : m.id))}
                        className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-full border transition-colors ${
                          addTradeSelectedMood === m.id ? "tj-primary-bg border-transparent font-semibold" : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        <MoodEmoji id={m.id} size={16} /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveAddTradeMood} disabled={!addTradeSelectedMood} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Save
                  </button>
                  <button onClick={skipAddTradeMood} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                    Skip
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Add Trade</p>
                  <button onClick={closeAddTradeDialog} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
                </div>
                <label className="block">
                  <span className="text-xs text-zinc-500">Trade date</span>
                  <div className="mt-1">
                    <CalendarPicker value={addTradeDate} onChange={setAddTradeDate} holidays={holidays} businessDaysOnly maxDate={localISODate(Date.now())} placeholder="Select date" />
                  </div>
                  {!addTradeDate && (
                    <p className="text-xs text-amber-400 mt-1.5">Today isn't a trading day pick another date to continue.</p>
                  )}
                </label>
                <p className="text-xs text-zinc-600">
                  A blank, editable row will be added to {addTradeDate ? monthLabel(monthKeyOf(addTradeDate)) : "the selected month"}&apos;s table. Pick a date in the current month to add it here, or any other date to jump straight to that month.
                </p>
                {addTradeDate && addTradeDate < localISODate(Date.now()) && (
                  <div>
                    {addTradeAffectsCapital === null ? (
                      <>
                        <p className="text-xs text-zinc-500 mb-1.5">Should this trade affect your total capital?</p>
                        <div className="flex gap-2">
                          <button onClick={() => setAddTradeAffectsCapital(true)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">Yes</button>
                          <button onClick={() => setAddTradeAffectsCapital(false)} className="flex-1 text-xs px-3 py-2 rounded-lg border bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600">No</button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-zinc-600">
                        {addTradeAffectsCapital ? "This trade will count toward your total capital." : "This trade will not affect your total capital."}{" "}
                        <button onClick={() => setAddTradeAffectsCapital(null)} className="tj-primary-text underline underline-offset-2">Change</button>
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={confirmAddTrade} disabled={!addTradeDate} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                    Add Trade
                  </button>
                  <button onClick={closeAddTradeDialog} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {downloadDialogOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 ${downloadDialogClosing ? "tj-backdrop-out" : "tj-fade"}`}
          onClick={closeDownloadDialog}
        >
          <div
            className={`w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 ${downloadDialogClosing ? "tj-dialog-out" : "tj-popover"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download Log</p>
              <button onClick={closeDownloadDialog} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <p className="text-xs text-zinc-600">
              Choose which entries to include for the selected date range ({filtered.length} {filtered.length === 1 ? "entry" : "entries"} total).
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.observation} onChange={() => toggleDownloadType("observation")} className="w-4 h-4 accent-amber-400" />
                Observation data
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.trade} onChange={() => toggleDownloadType("trade")} className="w-4 h-4 accent-amber-400" />
                Trade data
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.funds_added} onChange={() => toggleDownloadType("funds_added")} className="w-4 h-4 accent-amber-400" />
                Funds added
              </label>
              <label className="flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                <input type="checkbox" checked={downloadTypes.funds_withdrawn} onChange={() => toggleDownloadType("funds_withdrawn")} className="w-4 h-4 accent-amber-400" />
                Withdrawals
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={confirmDownloadPdf}
                  disabled={!downloadTypes.observation && !downloadTypes.trade && !downloadTypes.funds_added && !downloadTypes.funds_withdrawn}
                  className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
                >
                  .PDF
                </button>
                <button
                  onClick={confirmDownload}
                  disabled={!downloadTypes.observation && !downloadTypes.trade && !downloadTypes.funds_added && !downloadTypes.funds_withdrawn}
                  className="tj-primary-bg disabled:opacity-40 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
                >
                  .MD
                </button>
              </div>
              <button onClick={closeDownloadDialog} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {entryDownloadFor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 tj-fade"
          onClick={() => setEntryDownloadFor(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 tj-solid-bg shadow-2xl p-5 space-y-4 tj-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-100" style={FONT_DISPLAY}>Download Entry</p>
              <button onClick={() => setEntryDownloadFor(null)} className="text-zinc-500 hover:text-zinc-300 hover:rotate-90 transition-transform"><IconX size={16} /></button>
            </div>
            <p className="text-xs text-zinc-600">Choose a file format for this log entry.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { openLogAsPdf(entryDownloadFor); setEntryDownloadFor(null); }}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center border border-zinc-700"
              >
                .PDF
              </button>
              <button
                onClick={() => { downloadLogEntryAsMarkdown(entryDownloadFor); setEntryDownloadFor(null); }}
                className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center"
              >
                .MD
              </button>
            </div>
            <button onClick={() => setEntryDownloadFor(null)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm px-4 py-2.5 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}
        </>
      )}
      <ReminderAlarmPopup
        dueAlarms={dueAlarms}
        onClose={handleAlarmClose}
        onCloseAll={handleAlarmCloseAll}
        onSnoozeMinutes={handleAlarmSnoozeMinutes}
        onSnoozeAllMinutes={handleAlarmSnoozeAllMinutes}
        onSaveDateTime={handleAlarmSaveDateTime}
        onSaveDateTimeAll={handleAlarmSaveDateTimeAll}
      />
    </div>
  );
}

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

function PinDialogShell({ children }) {
  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl p-7 text-center tj-popover">
        <img src={logo} alt="Comet Trading Journal" className="h-14 w-auto mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

function PinSetupScreen({ onComplete, existingUser, hasExistingSecurityQuestions }) {
  const [step, setStep] = useState(1); // 1=choose pin, 2=confirm pin, 3=pick questions, 4=answer questions
  const [firstPin, setFirstPin] = useState("");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedPinRecord, setSavedPinRecord] = useState(null);
  const [fiveQuestions, setFiveQuestions] = useState(() => pickRandomQuestions(5));
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [answers, setAnswers] = useState({});

  const handleFirstComplete = (pin) => {
    setFirstPin(pin);
    setDigits(["", "", "", ""]);
    setError("");
    setStep(2);
  };

  const handleConfirmComplete = async (pin) => {
    if (pin !== firstPin) {
      setError("PINs didn't match — let's try again.");
      setDigits(["", "", "", ""]);
      setFirstPin("");
      setStep(1);
      return;
    }
    setSaving(true);
    const record = await createPinRecord(pin);
    if (hasExistingSecurityQuestions) {
      // Preserve existing security questions untouched — the user already
      // proved they know the answers (that's how they got here), so there's
      // no reason to force them to set up new ones right now.
      try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
      sessionStorage.setItem("tj-pin-unlocked", "1");
      setSaving(false);
      onComplete(record); // second arg omitted — tells the parent "questions unchanged"
      return;
    }
    setSaving(false);
    setSavedPinRecord(record);
    setStep(3);
  };

  const toggleQuestion = (id) => {
    setSelectedQuestionIds((prev) => {
      if (prev.includes(id)) return prev.filter((q) => q !== id);
      if (prev.length >= 2) return prev; // max 2 — deselect one first
      return [...prev, id];
    });
  };

  const refreshQuestions = () => {
    setFiveQuestions(pickRandomQuestions(5));
    setSelectedQuestionIds([]);
  };

  const finishSetup = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    const questionRecords = await Promise.all(
      selectedQuestionIds.map(async (qid) => {
        const record = await createPinRecord(normalizeAnswer(answers[qid] || ""));
        return { questionId: qid, salt: record.salt, hash: record.hash };
      })
    );
    const newSecurityQuestions = { answers: questionRecords };
    try { await dbStorage.set("security-questions", JSON.stringify(newSecurityQuestions)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord, newSecurityQuestions);
  };

  const skipSecurityQuestions = async () => {
    setSaving(true);
    try { await dbStorage.set("security-pin", JSON.stringify(savedPinRecord)); } catch (err) { /* best effort */ }
    sessionStorage.setItem("tj-pin-unlocked", "1");
    setSaving(false);
    onComplete(savedPinRecord); // second arg omitted — no security questions set up
  };

  const bothAnswered = selectedQuestionIds.length === 2 && selectedQuestionIds.every((qid) => (answers[qid] || "").trim().length > 0);

  if (step === 3) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Choose 2 Security Questions
        </div>
        <div className="flex items-center justify-between gap-2 mb-6">
          <p className="text-sm text-zinc-500 text-left">These let you reset your PIN later if you forget it. Pick any 2 of these 5.</p>
          <Tooltip text="Get a new set of questions">
            <button onClick={refreshQuestions} className="flex-shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors">
              <IconRotate size={15} />
            </button>
          </Tooltip>
        </div>
        <div className="space-y-2 text-left">
          {fiveQuestions.map((q) => {
            const selected = selectedQuestionIds.includes(q.id);
            return (
              <button
                key={q.id} onClick={() => toggleQuestion(q.id)}
                className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  selected ? "border-amber-400 bg-amber-400/10 text-zinc-100" : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                }`}
              >
                <span className={`w-4 h-4 rounded flex-shrink-0 border ${selected ? "bg-amber-400 border-amber-400" : "border-zinc-600"}`}>
                  {selected && <IconCheck size={13} strokeWidth={3} className="text-zinc-950" />}
                </span>
                {q.text}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setStep(4)}
          disabled={selectedQuestionIds.length !== 2}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          Continue ({selectedQuestionIds.length}/2 selected)
        </button>
        <button onClick={() => setStep(5)} className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-3">
          Set up later
        </button>
      </PinDialogShell>
    );
  }

  if (step === 5) {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-3" style={FONT_DISPLAY}>
          <IconShield size={22} className="text-amber-400" />
          Security Questions Skipped
        </div>
        <p className="text-sm text-zinc-400 mb-6">
          Setting up security questions lets you reset your PIN if you ever forget it. You can set them up anytime from Settings → Security Questions.
        </p>
        <button
          onClick={skipSecurityQuestions}
          disabled={saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-60 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Finishing up…" : "Okay"}
        </button>
      </PinDialogShell>
    );
  }

  if (step === 4) {
    const chosen = fiveQuestions.filter((q) => selectedQuestionIds.includes(q.id));
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answers aren't case-sensitive. Make sure you'll remember exactly what you type.</p>
        <div className="space-y-4 text-left">
          {chosen.map((q) => (
            <label key={q.id} className="block">
              <span className="text-xs text-zinc-500">{q.text}</span>
              <input
                type="text" value={answers[q.id] || ""} onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </label>
          ))}
        </div>
        <button
          onClick={finishSetup} disabled={!bothAnswered || saving}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {saving ? "Saving..." : "Finish Setup"}
        </button>
        <button onClick={() => setStep(3)} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back to question selection
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Set Up a Security PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">
        {existingUser
          ? "Add a PIN to keep your journal locked when you're not using it."
          : "Choose a 4-digit PIN to lock your journal."}
        {step === 2 && " Re-enter it to confirm."}
      </p>
      <PinDigitInput key={step} value={digits} onChange={setDigits} onComplete={step === 1 ? handleFirstComplete : handleConfirmComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {saving && <p className="text-xs text-zinc-500 mt-4">Saving...</p>}
    </PinDialogShell>
  );
}

function PinLockedOutScreen({ until, onSignOutReset, onExpired }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() >= until) { onExpired(); return; }
      forceTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  const remainingMs = Math.max(0, until - Date.now());
  const totalSec = Math.ceil(remainingMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const countdown = `${h}:${pad2(m)}:${pad2(s)}`;

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-rose-500" />
        Account Blocked
      </div>
      <p className="text-sm text-zinc-500 mb-2">Too many incorrect attempts. Try again in:</p>
      <p className="text-3xl font-bold text-rose-500 mb-6" style={FONT_MONO}>{countdown}</p>
      <div className="pointer-events-none opacity-40">
        <PinDigitInput value={["", "", "", ""]} onChange={() => {}} onComplete={() => {}} autoFocus={false} />
      </div>
      <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl mt-6 transition-colors">
        Logout
      </button>
    </PinDialogShell>
  );
}

function PinLockScreen({ pinRecord, securityQuestions, onUnlock, onSignOutReset, onPinCleared, onLockout, greetingName }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [checking, setChecking] = useState(false);
  const [view, setView] = useState("pin"); // pin | forgot-options | security-questions
  const [qaAnswers, setQaAnswers] = useState({});
  const [qaError, setQaError] = useState("");
  const [qaChecking, setQaChecking] = useState(false);
  const [qaAttempts, setQaAttempts] = useState(0);

  const handleComplete = async (pin) => {
    setChecking(true);
    const ok = await verifyPin(pin, pinRecord);
    setChecking(false);
    if (ok) {
      sessionStorage.setItem("tj-pin-unlocked", "1");
      onUnlock();
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setDigits(["", "", "", ""]);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setError(`Incorrect PIN. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  const hasSecurityQuestions = securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2;
  const qaLockedOut = qaAttempts >= 5;

  const verifyQuestions = async () => {
    setQaChecking(true);
    setQaError("");
    let allCorrect = true;
    for (const rec of securityQuestions.answers) {
      const given = normalizeAnswer(qaAnswers[rec.questionId] || "");
      const ok = await verifyPin(given, rec);
      if (!ok) { allCorrect = false; break; }
    }
    setQaChecking(false);
    if (allCorrect) { onPinCleared(); return; }
    const nextAttempts = qaAttempts + 1;
    setQaAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const until = Date.now() + 2 * 60 * 60 * 1000;
      try { await dbStorage.set("pin-lockout-until", JSON.stringify(until)); } catch (err) { /* best effort */ }
      onLockout(until);
      return;
    }
    setQaError(`One or both answers didn't match. ${5 - nextAttempts} attempt${5 - nextAttempts === 1 ? "" : "s"} left.`);
  };

  if (view === "forgot-options") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Reset Your PIN
        </div>
        <p className="text-sm text-zinc-500 mb-8">Choose how you'd like to verify it's really you.</p>
        <div className="space-y-3">
          {hasSecurityQuestions && (
            <button onClick={() => setView("security-questions")} className="w-full bg-amber-400 text-zinc-950 font-semibold text-sm px-5 py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-transform">
              Answer Security Questions
            </button>
          )}
          <button onClick={onSignOutReset} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm px-5 py-3 rounded-xl transition-colors">
            Logout
          </button>
        </div>
        <button onClick={() => setView("pin")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
          Back to Enter PIN
        </button>
      </PinDialogShell>
    );
  }

  if (view === "security-questions") {
    return (
      <PinDialogShell>
        <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
          <IconLock size={22} className="text-amber-400" />
          Answer Your Security Questions
        </div>
        <p className="text-sm text-zinc-500 mb-6">Answer both correctly to set up a new PIN.</p>
        <div className="space-y-4 text-left">
          {securityQuestions.answers.map((rec) => {
            const q = SECURITY_QUESTIONS.find((sq) => sq.id === rec.questionId);
            return (
              <label key={rec.questionId} className="block">
                <span className="text-xs text-zinc-500">{q ? q.text : "Question"}</span>
                <input
                  type="text" disabled={qaLockedOut} value={qaAnswers[rec.questionId] || ""}
                  onChange={(e) => setQaAnswers((prev) => ({ ...prev, [rec.questionId]: e.target.value }))}
                  className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50"
                />
              </label>
            );
          })}
        </div>
        {qaError && <p className="text-xs text-rose-400 mt-4">{qaError}</p>}
        <button
          onClick={verifyQuestions} disabled={qaChecking || qaLockedOut}
          className="w-full bg-amber-400 text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-5 py-3 rounded-xl mt-6 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {qaChecking ? "Checking..." : "Verify & Reset PIN"}
        </button>
        <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-4 underline">
          Back
        </button>
      </PinDialogShell>
    );
  }

  return (
    <PinDialogShell>
      <div className="flex items-center justify-center gap-2 text-xl font-bold text-zinc-50 mb-2" style={FONT_DISPLAY}>
        <IconLock size={22} className="text-amber-400" />
        Enter Your PIN
      </div>
      <p className="text-sm text-zinc-500 mb-8">{greetingName ? `Welcome back, ${greetingName}` : "Welcome back"} — enter your PIN to continue.</p>
      <PinDigitInput key={attempts} value={digits} onChange={setDigits} onComplete={handleComplete} autoFocus error={!!error} />
      {error && <p className="text-xs text-rose-400 mt-4">{error}</p>}
      {checking && <p className="text-xs text-zinc-500 mt-4">Checking...</p>}
      <button onClick={() => setView("forgot-options")} className="text-xs text-zinc-500 hover:text-zinc-300 mt-8 underline">
        Forgot your PIN?
      </button>
    </PinDialogShell>
  );
}

function LoginPage({ forceReauth }) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  const signInWithGoogle = async () => {
    setError("");
    setSigningIn(true);
    const queryParams = forceReauth
      ? { prompt: "login select_account", max_age: "0" }
      : { prompt: "select_account" };
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search, queryParams },
    });
    if (err) { setError(err.message || "Couldn't start Google sign-in. Please try again."); setSigningIn(false); }
    // On success the browser navigates away to Google, so no further state change is needed here.
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4" style={FONT_DISPLAY}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center mb-2">
          <img src={logo} alt="" className="h-20 w-auto mb-1" />
          <div className="text-xl text-zinc-50" style={{ fontFamily: "'Jost', sans-serif", fontWeight: 600 }}>Comet Trading Journal</div>
        </div>
        <p className="text-center text-sm text-zinc-500 mb-8" style={FONT_MONO}>A pre-trade discipline layer for options sellers and buyers.</p>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
          <p className="text-sm text-zinc-400 mb-5 text-center">
            {forceReauth ? "For security, please sign in again to confirm it's you before resetting your PIN." : "Sign in to access your journal."}
          </p>
          <button
            onClick={signInWithGoogle}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:opacity-60 text-zinc-800 font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
          >
            <GoogleLogo />
            {signingIn ? "Redirecting..." : "Sign in with Google"}
          </button>
          {error && <p className="text-xs text-rose-400 mt-3 text-center">{error}</p>}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6" style={FONT_MONO}>Your journal is private to your account.</p>
      </div>
    </div>
  );
}

// Supabase's OAuth 2.1 Server authenticates the user itself, then redirects
// here with an authorization_id — it deliberately doesn't host its own
// consent UI, so this app has to. Confirmed against this project's own
// installed @supabase/auth-js type definitions (not just doc examples)
// before writing this: getAuthorizationDetails can return either
// authorization details (show the screen below) or an already-consented
// redirect (skip straight through), and approveAuthorization/
// denyAuthorization redirect the browser automatically by default.
function OAuthConsentPage({ authorizationId }) {
  const [status, setStatus] = useState("loading"); // "loading" | "consent" | "processing" | "error"
  const [details, setDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Uses the same shared useThemeSettings load as PreTradeChecklist, so
  // this one-off page matches whichever theme the user actually has
  // selected instead of a hardcoded look.
  const { themeId, colorMode } = useThemeSettings();
  const baseTh = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const effectiveMode = colorMode || baseTh.defaultMode;
  const th = effectiveMode === baseTh.defaultMode ? baseTh : { ...baseTh, ...baseTh.alt };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      if (error) {
        setErrorMsg(error.message || "Couldn't load this connection request.");
        setStatus("error");
        return;
      }
      if (data && "redirect_url" in data) {
        window.location.href = data.redirect_url; // already consented before — no screen needed
        return;
      }
      setDetails(data);
      setStatus("consent");
    })();
    return () => { cancelled = true; };
  }, [authorizationId]);

  const handleApprove = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.approveAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't approve this request — please try again.");
      setStatus("error");
    }
    // On success the SDK redirects the browser itself — nothing further to do here.
  };

  const handleDeny = async () => {
    setStatus("processing");
    const { error } = await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error) {
      setErrorMsg(error.message || "Couldn't deny this request — please try again.");
      setStatus("error");
    }
  };

  const scopes = (details?.scope || "").split(/\s+/).filter(Boolean);

  return (
    <div
      className={`tj-app min-h-screen tj-theme-${th.id} tj-mode-${effectiveMode} flex items-center justify-center px-4`}
      style={{
        "--tj-primary": th.primary,
        "--tj-primary-contrast": th.primaryContrast,
        "--tj-secondary": th.secondary,
        "--tj-accent": th.accent,
        "--tj-bg": th.bg,
        "--tj-panel": th.panel,
        "--tj-panel2": th.panel2,
        "--tj-panel-solid": th.panelSolid || th.panel2,
        "--tj-border": th.border,
        "--tj-border-soft": th.borderSoft,
        "--tj-text1": th.text1,
        "--tj-text2": th.text2,
        "--tj-text3": th.text3,
        "--tj-text4": th.text4,
        "--tj-text5": th.text5,
        "--tj-radius-sm": th.radiusSm,
        "--tj-radius-md": th.radiusMd,
        "--tj-radius-lg": th.radiusLg,
        "--tj-shadow": th.shadow,
        "--tj-dur": th.transDur,
        "--tj-ease": th.transEase,
        "--tj-font-display": th.fontDisplay,
        "--tj-font-body": th.fontBody,
        "--tj-blur": th.blur,
        background: th.bg,
        color: th.text1,
        fontFamily: th.fontBody,
      }}
    >
      <style>{themeGlobalCss(th)}</style>
      {th.id === "crt" && <div className="tj-app-bg-overlay"></div>}
      <style>{THEME_PRIMARY_CSS}</style>
      <div className="w-full max-w-sm rounded-2xl border tj-solid-bg p-6 space-y-5" style={{ borderColor: "var(--tj-border)" }}>
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text4)" }}>Comet Trading Journal</p>
          <p className="text-lg font-semibold" style={{ ...FONT_DISPLAY, color: "var(--tj-text1)" }}>Connection Request</p>
        </div>

        {status === "loading" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Loading request details...</p>
        )}

        {status === "error" && (
          <>
            <p className="text-sm text-rose-400 text-center">{errorMsg}</p>
            <p className="text-xs text-center" style={{ color: "var(--tj-text4)" }}>You can close this window and try connecting again.</p>
          </>
        )}

        {status === "processing" && (
          <p className="text-sm text-center" style={{ color: "var(--tj-text3)" }}>Working...</p>
        )}

        {status === "consent" && details && (
          <>
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--tj-border)", background: "var(--tj-panel)" }}>
              <div className="flex items-center gap-3">
                {details.client?.logo_uri ? (
                  <img src={details.client.logo_uri} alt="" className="w-8 h-8 rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: "var(--tj-panel2)" }} />
                )}
                <p className="text-sm font-semibold truncate" style={{ color: "var(--tj-text1)" }}>{details.client?.name || "This application"}</p>
              </div>
              <p className="text-xs" style={{ color: "var(--tj-text4)" }}>wants to access your Comet Trading Journal data as <span style={{ color: "var(--tj-text2)" }}>{details.user?.email}</span>.</p>
              {scopes.length > 0 && (
                <div className="pt-1 border-t space-y-1" style={{ borderColor: "var(--tj-border-soft)" }}>
                  <p className="text-[10px] uppercase tracking-widest" style={{ ...FONT_MONO, color: "var(--tj-text5)" }}>Requested access</p>
                  {scopes.map((s) => (
                    <p key={s} className="text-xs" style={{ color: "var(--tj-text4)" }}>&bull; {s}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleApprove} className="tj-primary-bg font-semibold text-sm px-4 py-2.5 rounded-lg flex-1 hover:scale-[1.02] active:scale-95 transition-transform">
                Allow
              </button>
              <button onClick={handleDeny} className="text-sm px-4 py-2.5 rounded-lg flex-1" style={{ background: "var(--tj-panel2)", color: "var(--tj-text2)" }}>
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = signed out
  const [pinGate, setPinGate] = useState("checking"); // checking | needs-setup | needs-entry | locked-out | unlocked
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [pinRecord, setPinRecord] = useState(null);
  const [securityQuestions, setSecurityQuestions] = useState(null);
  const [greetingName, setGreetingName] = useState("");
  const [forceGoogleReauth, setForceGoogleReauth] = useState(false);
  const [deletionCancelledNotice, setDeletionCancelledNotice] = useState(false);
  const [pendingAuthorizationId] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("authorization_id");
    if (fromUrl) {
      try { sessionStorage.setItem("pending-oauth-authorization-id", fromUrl); } catch (e) { /* best effort */ }
      return fromUrl;
    }
    try { return sessionStorage.getItem("pending-oauth-authorization-id"); } catch (e) { return null; }
  });

  const forceSignOutStale = () => {
    sessionStorage.removeItem("tj-pin-unlocked");
    localStorage.removeItem("tj-last-active");
    supabase.auth.signOut();
  };

  const evaluatePinGate = async (currentSession) => {
    dbStorage.setUserId(currentSession.user.id);
    setGreetingName(currentSession.user.user_metadata?.full_name || currentSession.user.user_metadata?.name || "");

    // Account deletion is a 7-day grace-period soft-delete, enforced
    // lazily: nothing runs in the background while the user is away, and
    // that's by design — if they never log in again, their data simply
    // stays as-is indefinitely. This check, run at the next login attempt,
    // is the only place the deletion actually happens. If it's been 7+
    // days since they requested deletion, wipe everything now and sign
    // them out; logging in again after that is indistinguishable from a
    // brand new account, since there's nothing left of the old one.
    try {
      const res = await dbStorage.get("account-deletion-requested-at");
      const requestedAt = res && res.value ? JSON.parse(res.value) : null;
      if (requestedAt) {
        if (Date.now() - requestedAt >= SEVEN_DAYS_MS) {
          try { await deleteAllUserData(); } catch (err) { /* best effort */ }
          forceSignOutStale();
          return;
        } else {
          await dbStorage.delete("account-deletion-requested-at");
          setDeletionCancelledNotice(true);
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A 2-hour lockout triggered by 5 failed security-question attempts —
    // stored in the database (not just component state) so it survives
    // page reloads and can't be sidestepped by simply refreshing.
    try {
      const lockRes = await dbStorage.get("pin-lockout-until");
      const until = lockRes && lockRes.value ? JSON.parse(lockRes.value) : null;
      if (until) {
        if (Date.now() < until) {
          setLockoutUntil(until);
          setPinGate("locked-out");
          return;
        } else {
          await dbStorage.delete("pin-lockout-until");
        }
      }
    } catch (err) { /* don't block normal login over this check failing */ }

    // A PIN reset was requested (via "Forgot your PIN?") and the user has
    // just proven their identity again via a fresh Google sign-in — now
    // it's safe to actually clear the old PIN and let them choose a new one.
    // Stored in the database (not sessionStorage) so this reliably survives
    // the full sign-out -> Google redirect -> sign-back-in round trip,
    // regardless of browser tab behavior during that redirect.
    try {
      const pendingRes = await dbStorage.get("pin-reset-pending");
      if (pendingRes && pendingRes.value && JSON.parse(pendingRes.value) === true) {
        await dbStorage.delete("pin-reset-pending");
        try { await dbStorage.delete("security-pin"); } catch (err) { /* fall through to setup regardless */ }
        setPinRecord(null);
        setPinGate("needs-setup");
        return;
      }
    } catch (err) { /* fall through to normal pin gate logic if this check fails */ }

    // This reload was triggered by our own idle-timeout, not a fresh tab —
    // skip the "closed for 3h+" check below entirely, since we already know
    // this was a continuously-open tab, and go straight to re-locking it.
    const isIdleTriggeredReload = sessionStorage.getItem("tj-idle-reload-flag");
    if (isIdleTriggeredReload) sessionStorage.removeItem("tj-idle-reload-flag");

    if (!isIdleTriggeredReload) {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      const elapsed = Date.now() - lastActive;
      if (lastActive > 0 && elapsed > THREE_HOURS_MS) {
        // The app was closed (not signed out) for more than 3 hours — treat
        // this like a stale session and require a fresh Google sign-in.
        forceSignOutStale();
        return;
      }
    }

    let record = null;
    try {
      const res = await dbStorage.get("security-pin");
      record = res && res.value ? JSON.parse(res.value) : null;
    } catch (err) { /* treat as no PIN set yet */ }
    setPinRecord(record);

    try {
      const qRes = await dbStorage.get("security-questions");
      setSecurityQuestions(qRes && qRes.value ? JSON.parse(qRes.value) : null);
    } catch (err) { setSecurityQuestions(null); }

    if (!record) { setPinGate("needs-setup"); return; }

    // A PIN exists. If this exact tab session already unlocked it (and
    // hasn't been closed since — sessionStorage clears on tab close), skip
    // straight through. Otherwise, require the PIN again.
    if (sessionStorage.getItem("tj-pin-unlocked") === "1") setPinGate("unlocked");
    else setPinGate("needs-entry");
  };

  useEffect(() => {
    let cancelled = false;
    // A fresh OAuth sign-in redirect lands back here with ?code=... in the
    // URL, and Supabase is asynchronously exchanging it for a session right
    // as this effect runs. Treat that window specially — a getSession()
    // error here is far more likely to be a transient race with that
    // in-flight exchange than a genuinely stale, dangling token, so the
    // aggressive storage-clearing below must not run in that case.
    const oauthCallbackInProgress = window.location.search.includes("code=");
    supabase.auth.getSession().then(({ data, error }) => {
      if (cancelled) return;
      if (error && !oauthCallbackInProgress && (error.code === "session_not_found" || (error.message || "").includes("session_id claim"))) {
        // A leftover access token from an earlier session that was already
        // revoked server-side (e.g. by a prior sign-out or forced logout)
        // — the token itself hasn't expired yet, but the session it points
        // to no longer exists. Clear it so this resolves to a clean,
        // logged-out state instead of getting stuck here.
        try {
          Object.keys(localStorage).forEach((k) => { if (k.startsWith("sb-") && k.endsWith("-auth-token")) localStorage.removeItem(k); });
        } catch (e) { /* best effort */ }
        setSession(null);
        return;
      }
      setSession(data.session);
      if (data.session) { setForceGoogleReauth(false); evaluatePinGate(data.session); }
      else setPinGate("checking");
    }).catch(() => { if (!cancelled) setSession(null); });
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      dbStorage.setUserId(newSession ? newSession.user.id : null);
      if (event === "SIGNED_IN") {
        // A genuine, active sign-in (as opposed to the page simply
        // restoring an already-logged-in session on load) should always
        // land on the dashboard, not wherever the user happened to be
        // when they last signed out.
        try { localStorage.setItem("tj-last-tab", "home"); } catch (e) { /* best effort */ }
      }
      setSession(newSession);
      if (newSession) { setForceGoogleReauth(false); evaluatePinGate(newSession); }
      else setPinGate("checking");
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While unlocked: track activity, and auto-lock after 3 hours of none.
  useEffect(() => {
    if (pinGate !== "unlocked") return;
    const markActive = () => localStorage.setItem("tj-last-active", String(Date.now()));
    markActive();
    let lastMark = Date.now();
    const throttledMark = () => {
      const now = Date.now();
      if (now - lastMark > 30000) { lastMark = now; markActive(); }
    };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, throttledMark, { passive: true }));

    const idleCheck = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem("tj-last-active") || "0", 10);
      if (Date.now() - lastActive > THREE_HOURS_MS) {
        sessionStorage.setItem("tj-idle-reload-flag", "1");
        sessionStorage.removeItem("tj-pin-unlocked");
        window.location.reload();
      }
    }, 60000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, throttledMark));
      clearInterval(idleCheck);
    };
  }, [pinGate]);

  const handleSignOutReset = async () => {
    try { await dbStorage.set("pin-reset-pending", JSON.stringify(true)); } catch (err) { /* best effort */ }
    setForceGoogleReauth(true);
    forceSignOutStale();
  };

  const handlePinChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-pin", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setPinRecord(record);
  };

  const handleSecurityQuestionsChangedFromSettings = async (record) => {
    try { await dbStorage.set("security-questions", JSON.stringify(record)); } catch (err) { /* best effort */ }
    setSecurityQuestions(record);
  };

  if (session === undefined) return <AppLoadingScreen />;
  if (session === null) return <LoginPage forceReauth={forceGoogleReauth} />;
  if (pinGate === "checking") return <AppLoadingScreen />;

  const pinOverlayActive = pinGate === "needs-setup" || pinGate === "needs-entry" || pinGate === "locked-out";

  if (pinGate === "unlocked" && pendingAuthorizationId) {
    try { sessionStorage.removeItem("pending-oauth-authorization-id"); } catch (e) { /* best effort */ }
    return <OAuthConsentPage authorizationId={pendingAuthorizationId} />;
  }

  return (
    <>
      <div className={pinOverlayActive ? "tj-blur-locked" : ""}>
        <PreTradeChecklist
          session={session} pinRecord={pinRecord} onPinChanged={handlePinChangedFromSettings}
          securityQuestions={securityQuestions} onSecurityQuestionsChanged={handleSecurityQuestionsChangedFromSettings}
          deletionCancelledNotice={deletionCancelledNotice} onDismissDeletionNotice={() => setDeletionCancelledNotice(false)}
          pinUnlocked={pinGate === "unlocked"}
        />
      </div>
      {pinGate === "needs-setup" && (
        <PinSetupScreen
          existingUser={!!pinRecord}
          hasExistingSecurityQuestions={!!(securityQuestions && Array.isArray(securityQuestions.answers) && securityQuestions.answers.length === 2)}
          onComplete={(newPinRecord, newSecurityQuestions) => {
            setPinRecord(newPinRecord);
            if (newSecurityQuestions !== undefined) setSecurityQuestions(newSecurityQuestions);
            setPinGate("unlocked");
          }}
        />
      )}
      {pinGate === "locked-out" && (
        <PinLockedOutScreen
          until={lockoutUntil} onSignOutReset={handleSignOutReset}
          onExpired={() => { setLockoutUntil(null); setPinGate("needs-entry"); }}
        />
      )}
      {pinGate === "needs-entry" && (
        <PinLockScreen
          pinRecord={pinRecord} securityQuestions={securityQuestions} greetingName={greetingName}
          onUnlock={() => setPinGate("unlocked")} onSignOutReset={handleSignOutReset}
          onLockout={(until) => { setLockoutUntil(until); setPinGate("locked-out"); }}
          onPinCleared={async () => {
            try { await dbStorage.delete("security-pin"); } catch (err) { /* best effort */ }
            setPinRecord(null);
            setPinGate("needs-setup");
          }}
        />
      )}
    </>
  );
}
