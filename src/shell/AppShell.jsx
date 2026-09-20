import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate, Routes, Route, Navigate } from "react-router-dom";
import {
  IconActivity, IconArrowsExchange, IconBell, IconBellRinging, IconBooks,
  IconCalendar, IconCamera, IconChartBar, IconCheck, IconChecklist,
  IconChevronDown, IconChevronLeft, IconChevronUp, IconChevronsDown, IconChevronsUp, IconClock, IconClockHour4, IconCopy, IconCrosshair,
  IconDeviceDesktop, IconDotsVertical, IconExternalLink, IconFilePlus, IconFileText,
  IconFolder, IconFolderPlus, IconFolderSymlink, IconGitBranch, IconLayoutGrid, IconLink, IconList, IconLoader2, IconLock,
  IconMoodSmile, IconPalette, IconPercentage, IconPointFilled, IconRotate,
  IconSearch, IconShield, IconStack2, IconStar, IconStarFilled,
  IconTag, IconTerminal2, IconTrendingDown, IconTrendingUp, IconTrophy,
  IconUserCircle, IconUserOff, IconWallet, IconX,
} from "@tabler/icons-react";
import logo from "../assets/logo.png";
import { playAlarmChime, playErrorBeep } from "../lib/audio.js";
import { parseNoteBlocks, blockInlineText, blockNoteSnippet, blockNoteToPlainText, formatNoteLinks } from "../lib/noteBlocks.js";
import {
  supabase, dbStorage, dbTable, currentUserId, checkForHolidayLogUpdates, ADMIN_EMAIL, isAdminSession, DEFAULT_HOLIDAYS_2026,
  SHARED_HOLIDAYS_KEY, SHARED_HOLIDAY_LOG_KEY,
  NOTE_FILES_BUCKET, uploadNoteFile, readFileAsDataUrl, extractStoragePathsFromContent, deleteNoteStorageFiles, deleteAllNoteStorageFilesForUser,
  TRADE_IMAGES_BUCKET, uploadTradeFile, deleteTradeScreenshotFiles, deleteAllTradeStorageFilesForUser, deleteAllUserData,
} from "../lib/supabaseClient.js";
import { notify, subscribeToNotifications, deleteWithUndo, clearPersistedNotifications } from "../lib/notifications.js";
import { THEMES, themeGlobalCss, THEME_PRIMARY_CSS } from "../lib/theme.js";
import { useThemeSettings } from "../hooks/useThemeSettings.js";
import { useHolidayData } from "../hooks/useHolidayData.js";
import { useNotesData } from "../hooks/useNotesData.js";
import { useReminders } from "../hooks/useReminders.js";
import { useTradeData } from "../hooks/useTradeData.js";
import { useChecklistState } from "../hooks/useChecklistState.js";
import { IncompleteChecklistDialog } from "./components/IncompleteChecklistDialog.jsx";
import { AddTradeDialog } from "./components/AddTradeDialog.jsx";
import { DownloadLogDialog } from "./components/DownloadLogDialog.jsx";
import { TopNavBar } from "./components/TopNavBar.jsx";
import { AppFooter } from "./components/AppFooter.jsx";
import { TradeSetupPage } from "../pages/tradeSetup/TradeSetupPage.jsx";
import { StrategyBuilderPage } from "../pages/strategyBuilder/StrategyBuilderPage.jsx";
import { ChecklistPage } from "../pages/checklist/ChecklistPage.jsx";
import { TradeLogPage } from "../pages/tradeLog/TradeLogPage.jsx";
import { FONT_DISPLAY, FONT_MONO, fmt2dp, fmtINRsigned, fmtHour12, formatRelativeTime } from "../lib/format.js";
import {
  tradeRowToJs, tradeJsToRow, reminderRowToJs, reminderJsToRow, fundTxRowToJs, fundTxJsToRow,
  noteRowToJs, noteJsToRow, folderRowToJs, folderJsToRow, historyRowToJs, historyJsToRow,
} from "../lib/rowMappers.js";
import { bufToHex, hashPin, createPinRecord, verifyPin, SECURITY_QUESTIONS, normalizeAnswer, pickRandomQuestions } from "../lib/security.js";
import { REMINDER_SEVERITY, REMINDER_EVENT_GROUPS, REMINDER_TRADE_GROUPS, REMINDER_TOTAL_COUNT, reminderBuiltInSeverity } from "../lib/remindersData.js";
import {
  parseReminderTime, currentTimeString, reminderCombinedEpoch, reminderRelativeAgo, reminderDayLabel, reminderTimeDisplay, reminderTimeToHour24,
} from "../lib/reminderTime.js";
import {
  DEFAULT_STRATEGIES, PROFILE_OPTIONS, inferStrategyProfile, describeInferredProfile, LEG_TEMPLATES,
  slugify, makeUniqueId, DEFAULT_SECTION_DEFS, CHECKLIST_PROFILE_OPTIONS, freshChecklistItemId, CUSTOM_SECTION_COLORS, buildEffectiveSections,
} from "../lib/checklistLogic.js";
import {
  bandIndexForDays, GREEKS_PROFILES, GREEKS_POLARITY, POLARITY_DISPLAY, getEffectiveGreeksProfile, getGreeksBand, COLOR_CLASSES,
} from "../lib/greeks.js";
import { computeHomeStats, heatCellStyle, buildMonthColumns } from "../lib/homeStats.js";
import {
  createPdfDoc, logCategoryName, buildLegChangeEvents, buildLogDetailPDF, buildLogsDetailPDF,
  buildMarkdownFromHistory, compareTradesNewestFirst, pnlGroupsByMonth, getTradeStatus, buildPnlMarkdown, buildPnlDetailPDF,
  freshLegId, legsFromTemplate, freshPnlId, freshNoteId, freshReminderId, freshFolderId, renderBlockNoteBlocksToPDF, buildNotePDF,
} from "../lib/exportEngine.js";
import { Tooltip } from "../components/shared/Tooltip.jsx";
import { InfoIcon } from "../components/shared/InfoIcon.jsx";
import { CollapsibleSection } from "../components/shared/CollapsibleSection.jsx";
import { PinDigitInput } from "../components/shared/PinDigitInput.jsx";
import { MoodPickerButton } from "../components/shared/MoodPickerButton.jsx";
import { MonthPicker } from "../components/shared/MonthPicker.jsx";
import { YearPicker } from "../components/shared/YearPicker.jsx";
import { ExpiryPicker } from "../components/shared/ExpiryPicker.jsx";
import { lockPageScroll, unlockPageScroll } from "../lib/scrollLock.js";
import { CompactFilterButton } from "../components/shared/CompactFilterButton.jsx";
import { ThemedSelect } from "../components/shared/ThemedSelect.jsx";
import { ToastStack } from "../components/shared/ToastStack.jsx";
import { TemplatePickerModal } from "../components/shared/TemplatePickerModal.jsx";
import { StrategyPicker } from "../components/shared/StrategyPicker.jsx";
import { LegsTimelineModal } from "../components/shared/LegsTimelineModal.jsx";
import { RemindersPage } from "../pages/reminders/RemindersPage.jsx";
import { AddReminderPage } from "../pages/reminders/AddReminderPage.jsx";
import { RescheduleReminderPage } from "../pages/reminders/RescheduleReminderPage.jsx";
import { RemindersSettingsPage } from "../pages/reminders/RemindersSettingsPage.jsx";
import { ReminderWindowSettingsPage } from "../pages/reminders/ReminderWindowSettingsPage.jsx";
import { EditCategoriesPage } from "../pages/reminders/EditCategoriesPage.jsx";
import { ReminderAlarmPopup } from "../pages/reminders/components/ReminderAlarmPopup.jsx";
import { PnlTab } from "../pages/tradeHistory/PnlTab.jsx";
import { ManageFundsDialog } from "../pages/tradeHistory/components/ManageFundsDialog.jsx";
import { MyLearningsTab } from "../pages/learnings/MyLearningsTab.jsx";
import { DocsPage } from "../pages/docs/DocsPage.jsx";
import { HolidayCalendarPage } from "../pages/holidays/HolidayCalendarPage.jsx";
import { SettingsPage } from "../pages/settings/SettingsPage.jsx";
import { HomePage } from "../pages/home/HomePage.jsx";
import { DATA_ROWS, RADIO_OPTIONS, dataReadLabel, getVerdict } from "../lib/marketRead.js";
import {
  MONTH_NAMES, MONTH_ABBR, EXPIRY_DOW_CUTOVER, localISODate,
  isWeekendISO, nearestLegExpiry, contractDateCode, isLegComplete, drawPdfMasthead, formatLegLine, pad2,
  fmtDateDMY, fmtDateTimeDMY, fmtTimeOnly, isoToDMY, isoToWordDate, isoToMonDDYYYY, isoToShortDate, daysUntil,
  shiftForHoliday, nextWeekdayOnOrAfter, lastWeekdayOfMonth, expiryDayOfWeekFor, generateExpiryOptions,
  legsToParts, computeNetPremiumSigned, computeStrategyPayoff, escHtml, computeLegPL, computeClosedLegsPL, classifyLegSymbol,
  isStrategyHedgeEligible, legsMatchForGrouping, findMatchingActiveLeg, groupLegsByPosition, closeLotsFIFO, detectStrategyShape, resolveDetectedStrategyLabel,
} from "../lib/dateUtils.js";
import { AppLoadingScreen } from "../components/shared/AppLoadingScreen.jsx";
import { pathToTab, tabToPath } from "../lib/routes.js";

export function AppShell({ session, pinRecord, onPinChanged, securityQuestions, onSecurityQuestionsChanged, deletionCancelledNotice, onDismissDeletionNotice, pinUnlocked }) {
  const location = useLocation();
  const navigate = useNavigate();
  const topTab = pathToTab(location.pathname);
  const setTopTab = useCallback((tab) => navigate(tabToPath(tab)), [navigate]);

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

  const [userProfile, setUserProfile] = useState({ name: "", nickname: "", email: "", avatarType: null, avatarValue: "" });
  const [profileLoading, setProfileLoading] = useState(true);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [homePrefsLoading, setHomePrefsLoading] = useState(true);
  const { themeId, setThemeId, colorMode, setColorMode, themeReady } = useThemeSettings();
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarMenuCoords, setAvatarMenuCoords] = useState(null);
  const avatarBtnRef = useRef(null);
  const [previousTopTab, setPreviousTopTab] = useState("setup");
  const [reminderPrefill, setReminderPrefill] = useState(null);
  const [reschedulingReminder, setReschedulingReminder] = useState(null);

  useEffect(() => {
    let cancelled = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // useTradeData's own callbacks (Add Trade date validity, log/P&L export
  // labels) need the live holiday list and strategy-label lookup — but
  // those are owned by useHolidayData/useChecklistState, which in turn need
  // useTradeData's state (pnlEntries/history + setters, totalCapital/loading
  // flags) to even be called. Neither value is read during render, only
  // inside these user-triggered callbacks, so a ref updated later in this
  // same render (right after the hook that actually owns it runs) breaks
  // the cycle with zero staleness — by the time a user could ever trigger
  // one of these callbacks, the ref has already been set for this render.
  const strategyLabelLookupRef = useRef((id) => id || "Trade");
  const strategyLabelLookupStable = useCallback((id) => strategyLabelLookupRef.current(id), []);
  const holidaysRef = useRef([]);
  const getHolidays = useCallback(() => holidaysRef.current, []);

  const {
    pnlEntries, setPnlEntries, pnlLoading, history, setHistory, historyLoading,
    monthlyCharges, monthlyChargesLoading, capitalBase, setCapitalBase, capitalBaseLoading,
    fundTransactions, fundTransactionsLoading, manageFundsDialogOpen, setManageFundsDialogOpen,
    selectedMonthKey, setSelectedMonthKey, pnlPendingDeleteId, setPnlPendingDeleteId,
    deletingHistoryTs, deletingPnlId, pendingRevealTradeId, setPendingRevealTradeId,
    pendingDeleteTs, setPendingDeleteTs, entryDownloadFor, setEntryDownloadFor, logRangeCustomOpen, setLogRangeCustomOpen,
    rangeFrom, setRangeFrom, rangeTo, setRangeTo,
    moodFilterPoint, setMoodFilterPoint, moodFilterMood, setMoodFilterMood, moodFilterRefine, setMoodFilterRefine,
    setHistoryPage, downloadDialogOpen, downloadDialogClosing, downloadTypes,
    addTradeDialogOpen, addTradeDialogClosing, addTradeDate, setAddTradeDate, addTradeAffectsCapital, setAddTradeAffectsCapital,
    addTradeMoodStepTs, addTradeSelectedMood, setAddTradeSelectedMood, newTradeIdToEdit, setNewTradeIdToEdit,
    pnlExportScope, setPnlExportScope, pnlExportMonth, setPnlExportMonth, pnlExportYear, setPnlExportYear,
    pnlExportRangeFrom, setPnlExportRangeFrom, pnlExportRangeTo, setPnlExportRangeTo,
    totalCapital,
    updatePnlEntry, recordTradeChange, setMonthlyCharge,
    deleteEntry, confirmDeleteEntry, addFundTransaction, resolvePastTradeDisplay,
    openLogAsPdf, downloadLogEntryAsMarkdown, deletePnlEntry, confirmDeletePnlEntry,
    openAddTradeDialog, closeAddTradeDialog, confirmAddTrade, saveAddTradeMood, skipAddTradeMood,
    filtered, openDownloadDialog, closeDownloadDialog, toggleDownloadType,
    confirmDownload, confirmDownloadPdf,
    downloadPnlMarkdown, viewPnlAsPdf,
    setPresetToday, setPresetWeek, setPresetMonth, setPresetAll, activeRangePreset,
    totalHistoryPages, clampedPage, pagedHistory,
    setFundTransactions, setMonthlyCharges, clearDirtyPnlIds,
  } = useTradeData({ getHolidays, strategyLabelLookup: strategyLabelLookupStable });

  const { holidays, holidaysLoading, saveHoliday, deleteHoliday } = useHolidayData({ session, pnlEntries, setPnlEntries, history, setHistory });
  holidaysRef.current = holidays;

  const {
    mode, handleModeToggle,
    customStrategies, setCustomStrategies, checklistOverrides, checklistOverridesLoading, sections,
    strategyType, setStrategyType, strategyCategory, setStrategyCategory,
    showAddStrategy, setShowAddStrategy, editingStratId, setEditingStratId,
    showManageStrategies, setShowManageStrategies, pendingDeleteStratId, setPendingDeleteStratId,
    underlying, setUnderlying, legs, addLeg, removeLeg, updateLeg,
    checked, toggleItem, toggleAllInSection,
    region2Animated, contentUsesSpecialSlide,
    capital, setCapital, plannedLoss, setPlannedLoss, customRiskPct, setCustomRiskPct,
    targetRiskPct, editingTargetRisk, setEditingTargetRisk, targetRiskDraft, setTargetRiskDraft,
    saveTargetRiskPct, applyRiskPct, activeRiskPct, capNum, pct, pctColor, pctVerdict,
    notes, setNotes, screenshots, setScreenshots,
    entryMood, setEntryMood, entryMoodNote, setEntryMoodNote, entryMoodNoteOpen, setEntryMoodNoteOpen,
    entryMoodNoteDraft, setEntryMoodNoteDraft,
    dataReads, setDataRow, activeTab, setActiveTab,
    saveStatus, incompleteChecklistDialogOpen, setIncompleteChecklistDialogOpen, checklistManagerOpen, setChecklistManagerOpen,
    allStrategies, strategiesInCategory, strategyLabelLookup, currentStrategy, profile,
    netPremium, payoffInfo, applicableItems, totalApplicable,
    missingCritical, readyToTrade, legsComplete, itemToSection,
    marketAvg, marketVerdict, progressPct, tabs, activeSection,
    addCustomStrategy, editCustomStrategy, deleteCustomStrategy,
    addChecklistItem, editChecklistItem, deleteChecklistItem, editChecklistSectionTitle, addChecklistSection, deleteChecklistSection,
    handleSaveClick, saveCheck, startNewCheck,
  } = useChecklistState({
    topTab, setTopTab,
    totalCapital, capitalBaseLoading, fundTransactionsLoading, pnlLoading, monthlyChargesLoading,
    setHistory, setPnlEntries, setSelectedMonthKey,
  });
  strategyLabelLookupRef.current = strategyLabelLookup;

  const {
    learningNotes, setLearningNotes, notesLoading, noteFolders, setNoteFolders, foldersLoading, noteTemplates, notesByTradeId,
    pendingOpenNoteId, setPendingOpenNoteId,
    addNote, updateNote, deleteNote, bulkDeleteNotes, moveNoteToFolder, duplicateNote, toggleNoteStarred,
    downloadNoteAsPdf, addFolder, renameFolder, deleteFolder, moveFolderToFolder,
  } = useNotesData({ pnlEntries });

  const {
    reminders, setReminders, reminderSeverityOverrides, setReminderSeverityOverrides,
    reminderHiddenSubcategories, setReminderHiddenSubcategories, reminderCustomSubcategories, setReminderCustomSubcategories,
    reminderListWindowDays, setReminderAlarmDismissed, dueAlarms,
    reminderSeverityFor, setReminderCategorySeverity, reminderEffectiveGroups,
    hideReminderSubcategory, addCustomReminderSubcategory, removeCustomReminderSubcategory, setReminderListWindow,
    renameReminderItem, renameReminderGroup, addReminder, updateReminder, deleteReminder,
    remindersWithDays, dueReminders,
    handleAlarmClose, handleAlarmCloseAll, handleAlarmSnoozeMinutes, handleAlarmSnoozeAllMinutes,
    handleAlarmSaveDateTime, handleAlarmSaveDateTimeAll,
  } = useReminders();

  const openNoteFromTrade = (noteId) => {
    setTopTab("learn");
    setPendingOpenNoteId(noteId);
  };
  const openTradeFromReminder = (tradeId) => {
    setTopTab("pnl");
    setPendingRevealTradeId(tradeId);
  };
  const createReminderAt = (date, time) => {
    setReminderPrefill({ date, time: time || null });
    setTopTab("addReminder");
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
      clearDirtyPnlIds();
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

  const saveProfile = (nextProfile) => {
    setUserProfile(nextProfile);
  };

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

  // Every one of these previously only gated a save-effect (preventing a
  // premature write before the real data arrived) with no visual feedback
  // at all — meaning the app would briefly flash defaults (₹0 capital,
  // sections snapping from collapsed to expanded, a blank profile name)
  // on every load before quietly correcting itself a moment later.
  const appDataReady = themeReady && !checklistOverridesLoading && !historyLoading && !pnlLoading &&
    !monthlyChargesLoading && !capitalBaseLoading && !fundTransactionsLoading &&
    !holidaysLoading && !profileLoading && !homePrefsLoading && !notesLoading && !foldersLoading;

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
      <TopNavBar
        navRef={navRef}
        navHidden={navHidden}
        topTab={topTab}
        setTopTab={setTopTab}
        mode={mode}
        baseTh={baseTh}
        effectiveMode={effectiveMode}
        setColorMode={setColorMode}
        userProfile={userProfile}
        avatarMenuOpen={avatarMenuOpen}
        setAvatarMenuOpen={setAvatarMenuOpen}
        avatarMenuCoords={avatarMenuCoords}
        setAvatarMenuCoords={setAvatarMenuCoords}
        avatarBtnRef={avatarBtnRef}
        previousTopTab={previousTopTab}
        setPreviousTopTab={setPreviousTopTab}
      />

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
        {(topTab === "profile" || topTab === "holidays" || topTab === "reminders" || topTab === "docs" || topTab === "strategyBuilder") && (
          <button
            onClick={() => setTopTab(previousTopTab)}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <IconChevronLeft size={16} /> Back
          </button>
        )}

        <Routes>
        <Route path="/" element={<Navigate to={tabToPath("home")} replace />} />
        <Route path={tabToPath("home")} element={(
          <div key="home" className="tj-fade">
            <HomePage
              userProfile={userProfile} totalCapital={totalCapital} pnlEntries={pnlEntries} history={history}
              journeyOpen={journeyOpen} setJourneyOpen={setJourneyOpen} deepDiveOpen={deepDiveOpen} setDeepDiveOpen={setDeepDiveOpen}
              dueReminders={dueReminders} onOpenReminders={() => { setPreviousTopTab(topTab); setTopTab("reminders"); }}
            />
          </div>
        )} />

        <Route path="/reminders" element={(
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
        )} />

        <Route path="/reminders/add" element={(
          <div key="addReminder" className="tj-fade">
            <AddReminderPage
              onBack={() => { setReminderPrefill(null); setTopTab("reminders"); }}
              onSave={async (payload) => { const r = await addReminder(payload); if (r) { setReminderPrefill(null); setTopTab("reminders"); } }}
              effectiveGroups={reminderEffectiveGroups}
              reminderSeverityFor={reminderSeverityFor}
              prefill={reminderPrefill}
            />
          </div>
        )} />

        <Route path="/reminders/reschedule" element={reschedulingReminder ? (
          <div key="rescheduleReminder" className="tj-fade">
            <RescheduleReminderPage
              reminder={reschedulingReminder}
              onBack={() => { setReschedulingReminder(null); setTopTab("reminders"); }}
              onSave={async (id, payload) => { await updateReminder(id, payload); notify(`Reminder rescheduled — ${reschedulingReminder.title}.`); setReschedulingReminder(null); setTopTab("reminders"); }}
            />
          </div>
        ) : null} />

        <Route path="/reminders/settings" element={(
          <div key="reminderSettings" className="tj-fade">
            <RemindersSettingsPage
              onBack={() => setTopTab("reminders")}
              onEditWindowClick={() => setTopTab("reminderWindowSettings")}
              onEditCategoriesClick={() => setTopTab("editCategories")}
            />
          </div>
        )} />

        <Route path="/reminders/settings/window" element={(
          <div key="reminderWindowSettings" className="tj-fade">
            <ReminderWindowSettingsPage
              onBack={() => setTopTab("reminderSettings")}
              windowDays={reminderListWindowDays}
              onChangeWindow={setReminderListWindow}
            />
          </div>
        )} />

        <Route path="/reminders/settings/categories" element={(
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
        )} />

        <Route path="/settings" element={(
          <div key="profile" className="tj-fade">
            <SettingsPage
              profile={userProfile} onSaveProfile={saveProfile} onClearData={clearSelectedData} onDownloadBackup={downloadFullBackup} hasCustomStrategies={customStrategies.length > 0} themeId={themeId} onSaveTheme={setThemeId}
              pinRecord={pinRecord} onPinChanged={onPinChanged} onDeleteAccount={deleteMyAccount}
              securityQuestions={securityQuestions} onSecurityQuestionsChanged={onSecurityQuestionsChanged}
            />
          </div>
        )} />

        <Route path="/holidays" element={(
          <div key="holidays" className="tj-fade">
            <HolidayCalendarPage holidays={holidays} onSave={saveHoliday} onDelete={deleteHoliday} isAdmin={isAdminSession(session)} />
          </div>
        )} />

        <Route path="/docs" element={(
          <div key="docs" className="tj-fade">
            <DocsPage />
          </div>
        )} />

        <Route path={tabToPath("strategyBuilder")} element={(
          <StrategyBuilderPage
            allStrategies={allStrategies} customStrategies={customStrategies}
            addCustomStrategy={addCustomStrategy} editCustomStrategy={editCustomStrategy} deleteCustomStrategy={deleteCustomStrategy}
          />
        )} />

        <Route path={tabToPath("setup")} element={mode !== "trade" ? null : (
          <TradeSetupPage
            key="setup"
            strategyCategory={strategyCategory} setStrategyCategory={setStrategyCategory}
            allStrategies={allStrategies} strategyType={strategyType} setStrategyType={setStrategyType} strategiesInCategory={strategiesInCategory}
            showAddStrategy={showAddStrategy} setShowAddStrategy={setShowAddStrategy} customStrategies={customStrategies}
            showManageStrategies={showManageStrategies} setShowManageStrategies={setShowManageStrategies}
            editingStratId={editingStratId} setEditingStratId={setEditingStratId}
            pendingDeleteStratId={pendingDeleteStratId} setPendingDeleteStratId={setPendingDeleteStratId}
            addCustomStrategy={addCustomStrategy} editCustomStrategy={editCustomStrategy} deleteCustomStrategy={deleteCustomStrategy}
            underlying={underlying} setUnderlying={setUnderlying} legs={legs} addLeg={addLeg} removeLeg={removeLeg} updateLeg={updateLeg}
            netPremium={netPremium} payoffInfo={payoffInfo} holidays={holidays}
            profile={profile} currentStrategy={currentStrategy}
            editingTargetRisk={editingTargetRisk} setEditingTargetRisk={setEditingTargetRisk}
            targetRiskDraft={targetRiskDraft} setTargetRiskDraft={setTargetRiskDraft} targetRiskPct={targetRiskPct} saveTargetRiskPct={saveTargetRiskPct}
            capital={capital} setCapital={setCapital} plannedLoss={plannedLoss} setPlannedLoss={setPlannedLoss}
            pct={pct} pctColor={pctColor} pctVerdict={pctVerdict} capNum={capNum} activeRiskPct={activeRiskPct} applyRiskPct={applyRiskPct}
            customRiskPct={customRiskPct} setCustomRiskPct={setCustomRiskPct}
            notes={notes} setNotes={setNotes} noteTemplates={noteTemplates} screenshots={screenshots} setScreenshots={setScreenshots}
            entryMood={entryMood} setEntryMood={setEntryMood}
            entryMoodNoteOpen={entryMoodNoteOpen} setEntryMoodNoteOpen={setEntryMoodNoteOpen}
            entryMoodNoteDraft={entryMoodNoteDraft} setEntryMoodNoteDraft={setEntryMoodNoteDraft}
            entryMoodNote={entryMoodNote} setEntryMoodNote={setEntryMoodNote}
            handleSaveClick={handleSaveClick} saveStatus={saveStatus} mode={mode} legsComplete={legsComplete} startNewCheck={startNewCheck}
          />
        )} />

        <Route path={tabToPath("checklist")} element={(
          <ChecklistPage
            key="checklist"
            checklistManagerOpen={checklistManagerOpen} setChecklistManagerOpen={setChecklistManagerOpen}
            mode={mode} handleModeToggle={handleModeToggle} region2Animated={region2Animated} sc={sc}
            readyToTrade={readyToTrade} missingCritical={missingCritical} progressPct={progressPct}
            tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab}
            sections={sections} addChecklistItem={addChecklistItem} editChecklistItem={editChecklistItem} deleteChecklistItem={deleteChecklistItem}
            addChecklistSection={addChecklistSection} deleteChecklistSection={deleteChecklistSection} editChecklistSectionTitle={editChecklistSectionTitle}
            dataReads={dataReads} setDataRow={setDataRow} marketAvg={marketAvg} marketVerdict={marketVerdict}
            contentUsesSpecialSlide={contentUsesSpecialSlide} activeSection={activeSection} profile={profile} strategyType={strategyType}
            checked={checked} toggleItem={toggleItem} toggleAllInSection={toggleAllInSection}
            setTopTab={setTopTab} itemToSection={itemToSection}
            notes={notes} setNotes={setNotes} noteTemplates={noteTemplates} screenshots={screenshots} setScreenshots={setScreenshots} underlying={underlying}
            entryMood={entryMood} setEntryMood={setEntryMood}
            entryMoodNoteOpen={entryMoodNoteOpen} setEntryMoodNoteOpen={setEntryMoodNoteOpen}
            entryMoodNoteDraft={entryMoodNoteDraft} setEntryMoodNoteDraft={setEntryMoodNoteDraft}
            entryMoodNote={entryMoodNote} setEntryMoodNote={setEntryMoodNote}
            handleSaveClick={handleSaveClick} saveStatus={saveStatus} currentStrategy={currentStrategy} legsComplete={legsComplete} startNewCheck={startNewCheck}
          />
        )} />

        <Route path={tabToPath("pnl")} element={(
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
        )} />

        <Route path="/log" element={(
          <TradeLogPage
            key="log"
            setTopTab={setTopTab} logRangeCustomOpen={logRangeCustomOpen} setLogRangeCustomOpen={setLogRangeCustomOpen} activeRangePreset={activeRangePreset}
            setPresetToday={setPresetToday} setPresetWeek={setPresetWeek} setPresetMonth={setPresetMonth} setPresetAll={setPresetAll}
            rangeFrom={rangeFrom} setRangeFrom={setRangeFrom} rangeTo={rangeTo} setRangeTo={setRangeTo} holidays={holidays}
            openDownloadDialog={openDownloadDialog} filtered={filtered}
            moodFilterPoint={moodFilterPoint} setMoodFilterPoint={setMoodFilterPoint} moodFilterMood={moodFilterMood} setMoodFilterMood={setMoodFilterMood}
            moodFilterRefine={moodFilterRefine} setMoodFilterRefine={setMoodFilterRefine}
            historyLoading={historyLoading} history={history} pagedHistory={pagedHistory} resolvePastTradeDisplay={resolvePastTradeDisplay} strategyLabelLookup={strategyLabelLookup}
            deletingHistoryTs={deletingHistoryTs} setEntryDownloadFor={setEntryDownloadFor} pendingDeleteTs={pendingDeleteTs} setPendingDeleteTs={setPendingDeleteTs} confirmDeleteEntry={confirmDeleteEntry}
            totalHistoryPages={totalHistoryPages} clampedPage={clampedPage} setHistoryPage={setHistoryPage}
          />
        )} />

        <Route path="*" element={<Navigate to={tabToPath("home")} replace />} />
        </Routes>

        <AppFooter />
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
        <IncompleteChecklistDialog
          missingCount={missingCritical.length}
          onClose={() => setIncompleteChecklistDialogOpen(false)}
          onProceedAnyway={() => { setIncompleteChecklistDialogOpen(false); saveCheck(); }}
          onGoToChecklist={() => { setIncompleteChecklistDialogOpen(false); setTopTab("checklist"); }}
        />
      )}

      {addTradeDialogOpen && (
        <AddTradeDialog
          closing={addTradeDialogClosing}
          moodStepTs={addTradeMoodStepTs}
          selectedMood={addTradeSelectedMood}
          onSelectMood={setAddTradeSelectedMood}
          onSaveMood={saveAddTradeMood}
          onSkipMood={skipAddTradeMood}
          date={addTradeDate}
          onDateChange={setAddTradeDate}
          holidays={holidays}
          affectsCapital={addTradeAffectsCapital}
          onAffectsCapitalChange={setAddTradeAffectsCapital}
          onConfirm={confirmAddTrade}
          onClose={closeAddTradeDialog}
        />
      )}

      {downloadDialogOpen && (
        <DownloadLogDialog
          closing={downloadDialogClosing}
          entryCount={filtered.length}
          downloadTypes={downloadTypes}
          onToggleType={toggleDownloadType}
          onDownloadPdf={confirmDownloadPdf}
          onDownloadMarkdown={confirmDownload}
          onClose={closeDownloadDialog}
        />
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
