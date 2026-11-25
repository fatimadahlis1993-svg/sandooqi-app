import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarCheck,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mic,
  Moon,
  PiggyBank,
  ReceiptText,
  RotateCcw,
  Scissors,
  Search,
  Settings,
  ShoppingBasket,
  Sun,
  Vault,
  X,
} from 'lucide-react';
import { AppLockOverlay } from './components/AppLockOverlay';
import { BillsDebtsView } from './components/BillsDebtsView';
import { DialogModal, ModalRequest } from './components/DialogModal';
import { ExpensesView } from './components/ExpensesView';
import { FamilyEntryOverlay } from './components/FamilyEntryOverlay';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { GoalsView } from './components/GoalsView';
import { HomeView } from './components/HomeView';
import { OfflineBanner, PWAInstallButton } from './components/PWAInstallButton';
import { QuickAddFab } from './components/QuickAddFab';
import { ReportsView } from './components/ReportsView';
import { TailoringView } from './components/TailoringView';
import { ToolsSettingsView } from './components/ToolsSettingsView';
import { TreasuryView } from './components/TreasuryView';
import { VoiceEntryModal } from './components/VoiceEntryModal';
import {
  AccountId,
  AppPage,
  Goal,
  HomeDebt,
  OrderStage,
  SandooqiDB,
  SeasonalBudget,
  SewDebtRecord,
  SewMaterial,
  SewingOrder,
} from './types/sandooqi';
import {
  computeCashReportForMonth,
  currentYM,
  debtRemaining,
  fmt,
  formatYM,
  getTxYM,
  localDateISO,
  makeTransaction,
  nextId,
  shiftYM,
  todayLabel,
  transactionAccount,
} from './utils/finance';
import {
  createDefaultDB,
  hashPinSha256,
  loadSandooqiDB,
  normalizeSandooqiDB,
  saveSandooqiDB,
} from './utils/storage';

const NAV_ITEMS: { id: AppPage; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'home', label: 'الرئيسية', icon: Home },
  { id: 'treasury', label: 'الخزينة', icon: Vault },
  { id: 'expenses', label: 'المصاريف', icon: ShoppingBasket },
  { id: 'bills', label: 'الديون', icon: ReceiptText },
  { id: 'goals', label: 'الميزانية', icon: PiggyBank },
  { id: 'tailoring', label: 'الخياطة', icon: Scissors },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'tools', label: 'الأدوات', icon: Settings },
];

export default function App() {
  const [db, setDb] = useState<SandooqiDB | null>(null);
  const [page, setPage] = useState<AppPage>('home');
  const [modal, setModal] = useState<ModalRequest>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [monthCloseOpen, setMonthCloseOpen] = useState(false);
  const [savePct, setSavePct] = useState(20);
  const [targetGoalId, setTargetGoalId] = useState<number>(0);
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; title: string } | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [toast, setToast] = useState<{ text: string; undo?: SandooqiDB } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const playChime = useCallback((enabled: boolean) => {
    if (!enabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
      setTimeout(() => ctx.close().catch(() => undefined), 250);
    } catch {
      // Ignore audio errors on restricted devices
    }
  }, []);

  const showToast = useCallback((text: string, undo?: SandooqiDB) => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ text, undo });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, undo ? 6000 : 3200);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadSandooqiDB().then(({ db: loaded, migratedFromLegacy }) => {
      if (!mounted) return;
      setDb(loaded);
      if (loaded.appLockEnabled) setIsAppLocked(true);
      if (loaded.goals[0]) setTargetGoalId(loaded.goals[0].id);
      if (migratedFromLegacy) {
        showToast('تم ترحيل بياناتك السابقة بنجاح إلى IndexedDB');
      }
    });
    return () => {
      mounted = false;
    };
  }, [showToast]);

  useEffect(() => {
    if (!db) return;
    document.documentElement.classList.toggle('dark', Boolean(db.darkMode));
  }, [db]);

  const commitDB = useCallback(
    (
      updater: (prev: SandooqiDB) => SandooqiDB,
      options?: { toastText?: string; allowUndo?: boolean; chime?: boolean }
    ) => {
      setDb((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveSandooqiDB(next).catch(() => {
          showToast('تعذر حفظ التغييرات في التخزين المحلي');
        });
        if (options?.chime) playChime(next.sound);
        if (options?.toastText) {
          showToast(options.toastText, options.allowUndo ? prev : undefined);
        }
        return next;
      });
    },
    [playChime, showToast]
  );

  const handleUndo = () => {
    if (!toast?.undo) return;
    const restored = toast.undo;
    setDb(restored);
    saveSandooqiDB(restored).catch(() => undefined);
    setToast(null);
  };

  const creditorNames = useMemo(() => {
    if (!db) return [];
    return Array.from(new Set(db.homeDebts.map((d) => d.creditor).filter(Boolean)));
  }, [db]);

  const monthCloseInfo = useMemo(() => {
    if (!db) return null;
    const pending = db.monthClosePending[0];
    const sourceMonth = pending ? pending.month : currentYM();
    const targetMonth = pending ? pending.target : shiftYM(sourceMonth, 1);
    const report = computeCashReportForMonth(db, sourceMonth);
    const closing = Math.max(0, report.home.balance);
    return { sourceMonth, targetMonth, report, closing };
  }, [db]);

  if (!db) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdf8ef] text-slate-800 dark:bg-slate-950 dark:text-slate-100">
        <div className="text-center">
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">صندوقي</div>
          <p className="mt-1 text-xs text-slate-500">جاري تحميل بياناتك بأمان...</p>
        </div>
      </div>
    );
  }

  if (isAppLocked) {
    return <AppLockOverlay storedPin={db.pin} onUnlock={() => setIsAppLocked(false)} />;
  }

  // Family-only restricted overlay
  if (db.familyEntryOnlyMode) {
    return (
      <>
        <OfflineBanner />
        <FamilyEntryOverlay
          db={db}
          onSelectMember={(member) =>
            commitDB((prev) => ({ ...prev, activeFamilyMember: member }))
          }
          onQuickExpense={(title, amount) =>
            commitDB(
              (prev) => ({
                ...prev,
                tx: [
                  makeTransaction({
                    accountId: 'family',
                    cat: 'exp',
                    type: 'out',
                    name: title,
                    amount,
                    person: prev.activeFamilyMember,
                  }),
                  ...prev.tx,
                ],
              }),
              { toastText: `تم تسجيل ${title} (${fmt(amount)})`, allowUndo: true, chime: true }
            )
          }
          onManualExpense={(title, amount, shop) =>
            commitDB(
              (prev) => ({
                ...prev,
                tx: [
                  makeTransaction({
                    accountId: 'family',
                    cat: 'exp',
                    type: 'out',
                    name: title,
                    amount,
                    person: prev.activeFamilyMember,
                    shop,
                  }),
                  ...prev.tx,
                ],
              }),
              { toastText: `تم تسجيل ${title}`, allowUndo: true, chime: true }
            )
          }
          onAddMarketItem={(name) =>
            commitDB(
              (prev) => ({
                ...prev,
                marketList: [
                  { id: nextId(), name, quantity: 1, unit: 'حبة', price: 0, done: false },
                  ...prev.marketList,
                ],
              }),
              { toastText: `أُضيف «${name}» لقائمة السوق` }
            )
          }
          onToggleMarketDone={(id) =>
            commitDB((prev) => ({
              ...prev,
              marketList: prev.marketList.map((m) =>
                m.id === id ? { ...m, done: !m.done } : m
              ),
            }))
          }
          onUnlockAdmin={() =>
            commitDB(
              (prev) => ({ ...prev, familyEntryOnlyMode: false }),
              { toastText: 'تم فتح وضع المدير الكامل' }
            )
          }
        />
        {toast && (
          <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg dark:bg-slate-800">
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-slate-950"
              >
                <RotateCcw className="h-3 w-3" />
                تراجع
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8ef] pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100 md:pb-8">
      {/* Top App Bar */}
      <header className="no-print safe-top sticky top-0 z-30 border-b border-emerald-800 bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg font-bold text-amber-300">
              ص
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">صندوقي</h1>
              <p className="text-[11px] text-emerald-100">إدارة مالية ذكية · {formatYM(currentYM())}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <PWAInstallButton compact />
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setVoiceOpen(true)}
              aria-label="تسجيل بالصوت"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                commitDB((prev) => ({ ...prev, privacyMode: !prev.privacyMode }))
              }
              aria-label="وضع الخصوصية"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            >
              {db.privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() =>
                commitDB((prev) => ({ ...prev, darkMode: !prev.darkMode }))
              }
              aria-label="الوضع الليلي"
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
            >
              {db.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {db.appLockEnabled && (
              <button
                type="button"
                onClick={() => setIsAppLocked(true)}
                aria-label="قفل التطبيق"
                className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <Lock className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Tab Navigation */}
        <nav className="hidden border-t border-emerald-800/70 bg-emerald-800/40 md:block">
          <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-white text-emerald-900'
                      : 'text-emerald-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <OfflineBanner />

      {/* Main Content */}
      <main className="mx-auto max-w-6xl p-4">
        {page === 'home' && (
          <HomeView
            db={db}
            onNavigate={setPage}
            onOpenVoice={() => setVoiceOpen(true)}
            onOpenMonthClose={() => setMonthCloseOpen(true)}
            onUpdateBudgetTotal={(override) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: { ...prev.budgetOrganizer, totalBudgetOverride: override },
                }),
                {
                  toastText:
                    override === null
                      ? 'تم ربط الميزانية بدخل الشهر تلقائياً'
                      : `تم تحديد الميزانية بـ ${fmt(override)}`,
                }
              )
            }
            onUpdateBudgetItemAmount={(id, amount) =>
              commitDB((prev) => ({
                ...prev,
                budgetOrganizer: {
                  ...prev.budgetOrganizer,
                  items: prev.budgetOrganizer.items.map((item) =>
                    item.id === id ? { ...item, amount } : item
                  ),
                },
              }))
            }
            onAddBudgetItem={(label, amount) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: {
                    ...prev.budgetOrganizer,
                    items: [
                      ...prev.budgetOrganizer.items,
                      { id: `b_${nextId()}`, label, amount },
                    ],
                  },
                }),
                { toastText: `تمت إضافة «${label}» وخصمه من الميزانية`, chime: true }
              )
            }
            onDeleteBudgetItem={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: {
                    ...prev.budgetOrganizer,
                    items: prev.budgetOrganizer.items.filter((item) => item.id !== id),
                  },
                }),
                { toastText: 'تم حذف البند من الميزانية', allowUndo: true }
              )
            }
            onRecordBudgetExpense={(item) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'family',
                      cat: 'exp',
                      type: 'out',
                      name: `بند الميزانية: ${item.label}`,
                      amount: item.amount,
                      person: prev.family[0] || '',
                    }),
                    ...prev.tx,
                  ],
                }),
                {
                  toastText: `تم تسجيل صرف «${item.label}» (${fmt(item.amount)}) في الخزينة`,
                  allowUndo: true,
                  chime: true,
                }
              )
            }
            onQuickExpense={(title, amount) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'family',
                      cat: 'exp',
                      type: 'out',
                      name: title,
                      amount,
                      person: prev.family[0] || '',
                    }),
                    ...prev.tx,
                  ],
                }),
                { toastText: `تم خصم ${title} (${fmt(amount)})`, allowUndo: true, chime: true }
              )
            }
          />
        )}

        {page === 'treasury' && (
          <TreasuryView
            db={db}
            onOpenMonthClose={() => setMonthCloseOpen(true)}
            onSaveSalaries={(s1, s2) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  s1,
                  s2,
                  monthSalaries: { ...prev.monthSalaries, [currentYM()]: { s1, s2 } },
                }),
                { toastText: 'تم حفظ رواتب الشهر الحالي', chime: true }
              )
            }
            onAddMovement={({ accountId, type, name, amount }) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId,
                      cat: type === 'in' ? 'inc' : 'exp',
                      type,
                      name,
                      amount,
                    }),
                    ...prev.tx,
                  ],
                }),
                { toastText: 'تم تسجيل الحركة المالية', allowUndo: true, chime: true }
              )
            }
            onTransfer={(from: AccountId, to: AccountId, amount: number, note: string) => {
              const transferId = nextId();
              const label = note || 'تحويل بين الحسابات';
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: to,
                      cat: 'transfer',
                      type: 'in',
                      name: `${label} (وارد)`,
                      amount,
                      transferId,
                      transferFromAccountId: from,
                      transferToAccountId: to,
                    }),
                    makeTransaction({
                      accountId: from,
                      cat: 'transfer',
                      type: 'out',
                      name: `${label} (صادر)`,
                      amount,
                      transferId,
                      transferFromAccountId: from,
                      transferToAccountId: to,
                    }),
                    ...prev.tx,
                  ],
                }),
                { toastText: `تم تحويل ${fmt(amount)} بنجاح`, allowUndo: true, chime: true }
              );
            }}
          />
        )}

        {page === 'expenses' && (
          <ExpensesView
            db={db}
            onPreviewPhoto={(src, title) => setPreviewPhoto({ src, title })}
            onNotify={showToast}
            onAddExpense={({ title, amount, person, shop, category, dateISO, payMode, creditor, due, photo }) => {
              const targetYM =
                dateISO && /^\d{4}-\d{2}/.test(dateISO) ? dateISO.slice(0, 7) : currentYM();
              const fullTitle =
                category && category !== 'أخرى' && !title.includes(category)
                  ? `${title} (${category})`
                  : title;
              if (payMode === 'debt') {
                commitDB(
                  (prev) => {
                    const debtId = nextId();
                    const newDebt: HomeDebt = {
                      id: debtId,
                      creditor,
                      item: fullTitle,
                      activity: category || 'مشتريات',
                      amount,
                      paid: 0,
                      payments: [],
                      due: due || undefined,
                      date: todayLabel(),
                      ym: targetYM,
                      direction: 'out',
                      photo: photo || undefined,
                    };
                    return {
                      ...prev,
                      homeDebts: [newDebt, ...prev.homeDebts],
                      tx: [
                        makeTransaction({
                          accountId: 'family',
                          cat: 'credit_purchase',
                          source: 'credit-purchase',
                          type: 'out',
                          name: `${fullTitle} (دين: ${creditor})`,
                          amount,
                          dateISO: dateISO || localDateISO(),
                          ym: targetYM,
                          person,
                          shop: creditor,
                          linkedCreditor: creditor,
                          homeDebtId: debtId,
                          photo: photo || undefined,
                        }),
                        ...prev.tx,
                      ],
                    };
                  },
                  { toastText: `تم تسجيل الدين لدى ${creditor}`, allowUndo: true, chime: true }
                );
              } else {
                commitDB(
                  (prev) => ({
                    ...prev,
                    tx: [
                      makeTransaction({
                        accountId: 'family',
                        cat: 'exp',
                        type: 'out',
                        name: fullTitle,
                        amount,
                        dateISO: dateISO || localDateISO(),
                        ym: targetYM,
                        person,
                        shop: shop || undefined,
                        photo: photo || undefined,
                      }),
                      ...prev.tx,
                    ],
                  }),
                  { toastText: `تم خصم ${fmt(amount)} للمصروف`, allowUndo: true, chime: true }
                );
              }
            }}
            onAddFamilyExpense={({ person, category, amount }) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'family',
                      cat: 'fam',
                      type: 'out',
                      name: `${category} (${person})`,
                      amount,
                      person,
                    }),
                    ...prev.tx,
                  ],
                }),
                { toastText: `تم تسجيل مصروف ${person} (${fmt(amount)})`, allowUndo: true, chime: true }
              )
            }
            onDeleteTransaction={(id) =>
              commitDB(
                (prev) => ({ ...prev, tx: prev.tx.filter((t) => t.id !== id) }),
                { toastText: 'تم حذف العملية', allowUndo: true }
              )
            }
            onAddMarketItem={(name, quantity, unit, price) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  marketList: [
                    { id: nextId(), name, quantity, unit, price, done: false },
                    ...prev.marketList,
                  ],
                }),
                { toastText: `تمت إضافة «${name}» لقائمة السوق` }
              )
            }
            onUpdateMarketItem={(id, patch) =>
              commitDB((prev) => ({
                ...prev,
                marketList: prev.marketList.map((m) => (m.id === id ? { ...m, ...patch } : m)),
              }))
            }
            onToggleMarketItem={(id, recordExpense) =>
              commitDB(
                (prev) => {
                  const target = prev.marketList.find((m) => m.id === id);
                  if (!target) return prev;
                  const nextDone = !target.done;
                  const lineCost = Math.round(
                    (Number(target.price) || 0) * (Number(target.quantity) || 1)
                  );
                  const shouldLogExpense = nextDone && recordExpense && lineCost > 0;
                  return {
                    ...prev,
                    marketList: prev.marketList.map((m) =>
                      m.id === id ? { ...m, done: nextDone } : m
                    ),
                    tx: shouldLogExpense
                      ? [
                          makeTransaction({
                            accountId: 'family',
                            cat: 'exp',
                            type: 'out',
                            name: `مشتريات السوق: ${target.name} (${target.quantity || 1} ${target.unit || 'حبة'})`,
                            amount: lineCost,
                            person: prev.family[0] || '',
                          }),
                          ...prev.tx,
                        ]
                      : prev.tx,
                  };
                },
                { chime: true }
              )
            }
            onDeleteMarketItem={(id) =>
              commitDB(
                (prev) => ({ ...prev, marketList: prev.marketList.filter((m) => m.id !== id) }),
                { toastText: 'تم الحذف من قائمة السوق', allowUndo: true }
              )
            }
            onClearDoneMarket={() =>
              commitDB(
                (prev) => ({ ...prev, marketList: prev.marketList.filter((m) => !m.done) }),
                { toastText: 'تم مسح الأغراض المقتناة', allowUndo: true }
              )
            }
            onUpdateMarketBudget={(budget) =>
              commitDB(
                (prev) => ({ ...prev, marketBudget: budget }),
                { toastText: `تم تحديث سقف قائمة السوق إلى ${fmt(budget)}` }
              )
            }
          />
        )}

        {page === 'bills' && (
          <BillsDebtsView
            db={db}
            onPreviewPhoto={(src, title) => setPreviewPhoto({ src, title })}
            onAddHomeDebt={({ creditor, item, activity, amount, due, direction, photo }) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  homeDebts: [
                    {
                      id: nextId(),
                      creditor,
                      item,
                      activity: activity || 'دين عام',
                      amount,
                      paid: 0,
                      payments: [],
                      due: due || undefined,
                      date: todayLabel(),
                      ym: currentYM(),
                      direction: direction || 'out',
                      photo: photo || undefined,
                    },
                    ...prev.homeDebts,
                  ],
                }),
                {
                  toastText:
                    direction === 'in'
                      ? `تم تسجيل مستحق (له) عند ${creditor}`
                      : `تم تسجيل دين (عليه) لـ ${creditor}`,
                  allowUndo: true,
                  chime: true,
                }
              )
            }
            onPayHomeDebt={(debt) => {
              const rem = debtRemaining(debt);
              const isIn = debt.direction === 'in';
              setModal({
                kind: 'input',
                title: `${isIn ? 'تحصيل مستحق' : 'تسديد دين'} — ${debt.creditor}`,
                message: `المتبقي حالياً: ${fmt(rem)}`,
                initialValue: String(rem),
                inputType: 'number',
                checkboxLabel: isIn
                  ? 'إضافة المبلغ المحصّل إلى الخزينة العائلية'
                  : 'خصم المبلغ المدفوع من الخزينة العائلية',
                checkboxDefault: true,
                confirmLabel: isIn ? 'تحصيل الدفعة' : 'تسديد الدفعة',
                onSubmit: (val, applyTreasury) => {
                  const payAmt = Math.min(rem, Math.max(0, Number(val) || 0));
                  if (payAmt <= 0) return;
                  commitDB(
                    (prev) => {
                      const paymentTx = applyTreasury
                        ? makeTransaction({
                            accountId: 'family',
                            cat: isIn ? 'inc' : 'debt_payment',
                            type: isIn ? 'in' : 'out',
                            name: `${isIn ? 'تحصيل مستحق' : 'تسديد دين'}: ${debt.creditor} (${debt.item})`,
                            amount: payAmt,
                            linkedCreditor: debt.creditor,
                            homeDebtId: debt.id,
                          })
                        : null;
                      return {
                        ...prev,
                        tx: paymentTx ? [paymentTx, ...prev.tx] : prev.tx,
                        homeDebts: prev.homeDebts.map((d) =>
                          d.id === debt.id
                            ? {
                                ...d,
                                paid: d.paid + payAmt,
                                payments: [
                                  ...(d.payments || []),
                                  {
                                    amount: payAmt,
                                    ym: currentYM(),
                                    date: todayLabel(),
                                    transactionId: paymentTx?.id,
                                  },
                                ],
                              }
                            : d
                        ),
                      };
                    },
                    {
                      toastText: `تم ${isIn ? 'تحصيل' : 'تسديد'} ${fmt(payAmt)} لـ ${debt.creditor}`,
                      allowUndo: true,
                      chime: true,
                    }
                  );
                },
              });
            }}
            onPayCreditorAll={(creditor, totalRemaining, direction = 'out') => {
              const isIn = direction === 'in';
              setModal({
                kind: 'input',
                title: `${isIn ? 'تحصيل مستحقات' : 'تسديد ديون'} — ${creditor}`,
                message: `إجمالي المتبقي: ${fmt(totalRemaining)} (يوزّع تلقائياً على الأقدم أولاً)`,
                initialValue: String(totalRemaining),
                inputType: 'number',
                checkboxLabel: isIn
                  ? 'إضافة المبلغ المحصّل إلى الخزينة العائلية'
                  : 'خصم المبلغ المدفوع من الخزينة العائلية',
                checkboxDefault: true,
                confirmLabel: isIn ? 'تحصيل الدفعة' : 'تسديد الدفعة',
                onSubmit: (val, applyTreasury) => {
                  const requested = Math.min(totalRemaining, Math.max(0, Number(val) || 0));
                  if (requested <= 0) return;
                  commitDB(
                    (prev) => {
                      const key = creditor.trim();
                      const openOldestFirst = prev.homeDebts
                        .filter(
                          (d) =>
                            (d.creditor || 'غير محدد').trim() === key &&
                            (d.direction === 'in' ? 'in' : 'out') === direction &&
                            debtRemaining(d) > 0
                        )
                        .slice()
                        .sort((a, b) => a.id - b.id);
                      let budget = requested;
                      const allocations: { debtId: number; amount: number }[] = [];
                      const allocMap = new Map<number, number>();
                      for (const d of openOldestFirst) {
                        if (budget <= 0) break;
                        const rem = debtRemaining(d);
                        const slice = Math.min(rem, budget);
                        if (slice > 0) {
                          allocations.push({ debtId: d.id, amount: slice });
                          allocMap.set(d.id, slice);
                          budget -= slice;
                        }
                      }
                      const totalPaid = allocations.reduce((s, a) => s + a.amount, 0);
                      if (totalPaid <= 0) return prev;
                      const paymentTx = applyTreasury
                        ? makeTransaction({
                            accountId: 'family',
                            cat: isIn ? 'inc' : 'debt_payment',
                            type: isIn ? 'in' : 'out',
                            name: `${isIn ? 'تحصيل مستحقات' : 'تسديد ديون'}: ${creditor}`,
                            amount: totalPaid,
                            linkedCreditor: creditor,
                            homeDebtAllocations: allocations,
                          })
                        : null;
                      return {
                        ...prev,
                        tx: paymentTx ? [paymentTx, ...prev.tx] : prev.tx,
                        homeDebts: prev.homeDebts.map((d) => {
                          const add = allocMap.get(d.id);
                          if (!add) return d;
                          return {
                            ...d,
                            paid: d.paid + add,
                            payments: [
                              ...(d.payments || []),
                              {
                                amount: add,
                                ym: currentYM(),
                                date: todayLabel(),
                                transactionId: paymentTx?.id,
                              },
                            ],
                          };
                        }),
                      };
                    },
                    {
                      toastText: `تم ${isIn ? 'تحصيل' : 'تسديد'} ${fmt(requested)} لـ ${creditor}`,
                      allowUndo: true,
                      chime: true,
                    }
                  );
                },
              });
            }}
            onDeleteHomeDebt={(id) =>
              setModal({
                kind: 'confirm',
                title: 'حذف الدين',
                message: 'هل تريد حذف سجل هذا الدين؟ يمكنك التراجع بعد الحذف خلال ثوانٍ.',
                confirmLabel: 'حذف',
                danger: true,
                onConfirm: () =>
                  commitDB(
                    (prev) => ({
                      ...prev,
                      homeDebts: prev.homeDebts.filter((d) => d.id !== id),
                    }),
                    { toastText: 'تم حذف سجل الدين', allowUndo: true }
                  ),
              })
            }
            onAddRentRecord={({ direction, unit, party, amount, due, immediate }) =>
              commitDB(
                (prev) => {
                  const tx = immediate
                    ? makeTransaction({
                        accountId: 'family',
                        cat: 'rent',
                        type: direction,
                        name: `${unit}: ${party}`,
                        amount,
                        rentUnit: unit,
                      })
                    : null;
                  return {
                    ...prev,
                    tx: tx ? [tx, ...prev.tx] : prev.tx,
                    rentDebts: [
                      {
                        id: nextId(),
                        direction,
                        unit,
                        party,
                        amount,
                        paid: immediate ? amount : 0,
                        settled: immediate,
                        treasuryApplied: immediate,
                        transactionId: tx ? tx.id : null,
                        due: due || undefined,
                        date: todayLabel(),
                        ym: currentYM(),
                      },
                      ...prev.rentDebts,
                    ],
                  };
                },
                { toastText: 'تم تسجيل حركة الكراء/المستحق', allowUndo: true, chime: true }
              )
            }
            onCollectRent={(id) =>
              commitDB(
                (prev) => {
                  const target = prev.rentDebts.find((r) => r.id === id);
                  if (!target || target.settled) return prev;
                  const tx = makeTransaction({
                    accountId: 'family',
                    cat: 'rent',
                    type: target.direction,
                    name: `تحصيل ${target.unit}: ${target.party}`,
                    amount: target.amount,
                    rentUnit: target.unit,
                  });
                  return {
                    ...prev,
                    tx: [tx, ...prev.tx],
                    rentDebts: prev.rentDebts.map((r) =>
                      r.id === id
                        ? {
                            ...r,
                            paid: r.amount,
                            settled: true,
                            treasuryApplied: true,
                            transactionId: tx.id,
                          }
                        : r
                    ),
                  };
                },
                { toastText: 'تم التحصيل وإضافته للخزينة', allowUndo: true, chime: true }
              )
            }
            onDeleteRent={(id) =>
              commitDB(
                (prev) => ({ ...prev, rentDebts: prev.rentDebts.filter((r) => r.id !== id) }),
                { toastText: 'تم حذف سجل الكراء', allowUndo: true }
              )
            }
            onAddObligation={({ name, amount, dueDay, creditor, photo }) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  obligations: [
                    {
                      id: nextId(),
                      name,
                      amount,
                      dueDay,
                      paidMonths: [],
                      creditor,
                      photo,
                    },
                    ...prev.obligations,
                  ],
                }),
                { toastText: `تمت إضافة فاتورة ${name}` }
              )
            }
            onToggleObligationPaid={(id) =>
              commitDB(
                (prev) => {
                  const ym = currentYM();
                  const ob = prev.obligations.find((o) => o.id === id);
                  if (!ob) return prev;
                  const isPaid = ob.paidMonths.includes(ym);
                  const nextObligations = prev.obligations.map((o) =>
                    o.id === id
                      ? {
                          ...o,
                          paidMonths: isPaid
                            ? o.paidMonths.filter((m) => m !== ym)
                            : [...o.paidMonths, ym],
                        }
                      : o
                  );
                  const nextTx = isPaid
                    ? prev.tx
                    : [
                        makeTransaction({
                          accountId: 'family',
                          cat: 'bill',
                          type: 'out',
                          name: `تسديد فاتورة: ${ob.name}`,
                          amount: ob.amount,
                        }),
                        ...prev.tx,
                      ];
                  return { ...prev, obligations: nextObligations, tx: nextTx };
                },
                { toastText: 'تم تحديث حالة الفاتورة', allowUndo: true, chime: true }
              )
            }
            onDeleteObligation={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  obligations: prev.obligations.filter((o) => o.id !== id),
                }),
                { toastText: 'تم حذف الالتزام', allowUndo: true }
              )
            }
            onAddBillEntry={({ name, amount, creditor, status, due, unpaidMonths, recurring, photo }) =>
              commitDB(
                (prev) => {
                  const ym = currentYM();
                  const monthsCount = Math.max(1, unpaidMonths || 1);
                  const totalDebtAmt = amount * monthsCount;
                  const nextDebts =
                    status === 'pending'
                      ? [
                          {
                            id: nextId(),
                            creditor: creditor || name,
                            item: monthsCount > 1 ? `${name} (${monthsCount} أشهر)` : name,
                            activity: 'فواتير',
                            amount: totalDebtAmt,
                            paid: 0,
                            payments: [],
                            due: due || undefined,
                            date: todayLabel(),
                            ym,
                            direction: 'out' as const,
                            photo: photo || undefined,
                          },
                          ...prev.homeDebts,
                        ]
                      : prev.homeDebts;
                  const nextTx =
                    status === 'paid'
                      ? [
                          makeTransaction({
                            accountId: 'family',
                            cat: 'bill',
                            type: 'out',
                            name: `فاتورة: ${name}${creditor && creditor !== name ? ` (${creditor})` : ''}`,
                            amount,
                            photo: photo || undefined,
                          }),
                          ...prev.tx,
                        ]
                      : prev.tx;
                  const nextObls = recurring
                    ? [
                        {
                          id: nextId(),
                          name,
                          amount,
                          dueDay: 15,
                          paidMonths: status === 'paid' ? [ym] : [],
                          creditor: creditor || undefined,
                          photo: photo || undefined,
                        },
                        ...prev.obligations,
                      ]
                    : prev.obligations;
                  return {
                    ...prev,
                    homeDebts: nextDebts,
                    tx: nextTx,
                    obligations: nextObls,
                  };
                },
                {
                  toastText:
                    status === 'pending'
                      ? `تم تسجيل فاتورة «${name}» في الديون`
                      : `تم دفع فاتورة «${name}» وخصمها من الخزينة`,
                  allowUndo: true,
                  chime: true,
                }
              )
            }
            onAddSalaryDeduction={({ facAmount, facNote, srvAmount, srvNote, srvMonth }) =>
              commitDB(
                (prev) => {
                  const added = [];
                  if (facAmount > 0) {
                    added.push(
                      makeTransaction({
                        accountId: 'family',
                        cat: 'fac',
                        type: 'out',
                        name: facNote ? `اقتطاع فاسيليتي: ${facNote}` : 'اقتطاع فاسيليتي من الراتب',
                        amount: facAmount,
                        ym: currentYM(),
                      })
                    );
                  }
                  if (srvAmount > 0) {
                    added.push(
                      makeTransaction({
                        accountId: 'family',
                        cat: 'srv',
                        type: 'out',
                        name: srvNote ? `اقتطاع خدمات: ${srvNote}` : 'اقتطاع خدمات / سلفة من الراتب',
                        amount: srvAmount,
                        ym: srvMonth || currentYM(),
                      })
                    );
                  }
                  return { ...prev, tx: [...added, ...prev.tx] };
                },
                { toastText: 'تم تسجيل اقتطاع الراتب', allowUndo: true, chime: true }
              )
            }
            onDeleteTransaction={(id) =>
              commitDB(
                (prev) => ({ ...prev, tx: prev.tx.filter((t) => t.id !== id) }),
                { toastText: 'تم حذف العملية', allowUndo: true }
              )
            }
            onAddFacPlan={(name, monthly, months) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  facPlans: [
                    { id: nextId(), name, monthly, months, paidMonths: 0, startYM: currentYM() },
                    ...prev.facPlans,
                  ],
                }),
                { toastText: `تمت إضافة خطة قسط: ${name}` }
              )
            }
            onPayFacMonth={(id) =>
              commitDB(
                (prev) => {
                  const plan = prev.facPlans.find((p) => p.id === id);
                  if (!plan || plan.paidMonths >= plan.months) return prev;
                  return {
                    ...prev,
                    facPlans: prev.facPlans.map((p) =>
                      p.id === id ? { ...p, paidMonths: p.paidMonths + 1 } : p
                    ),
                    tx: [
                      makeTransaction({
                        accountId: 'family',
                        cat: 'bill',
                        type: 'out',
                        name: `قسط (${plan.paidMonths + 1}/${plan.months}): ${plan.name}`,
                        amount: plan.monthly,
                      }),
                      ...prev.tx,
                    ],
                  };
                },
                { toastText: 'تم خصم قسط الشهر من الخزينة', allowUndo: true, chime: true }
              )
            }
            onDeleteFacPlan={(id) =>
              commitDB(
                (prev) => ({ ...prev, facPlans: prev.facPlans.filter((p) => p.id !== id) }),
                { toastText: 'تم حذف خطة القسط', allowUndo: true }
              )
            }
          />
        )}

        {page === 'goals' && (
          <GoalsView
            db={db}
            onUpdateBudgetTotal={(override) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: { ...prev.budgetOrganizer, totalBudgetOverride: override },
                }),
                {
                  toastText:
                    override === null
                      ? 'تم ربط الميزانية بدخل الشهر تلقائياً'
                      : `تم تحديد الميزانية بـ ${fmt(override)}`,
                }
              )
            }
            onUpdateBudgetItemAmount={(id, amount) =>
              commitDB((prev) => ({
                ...prev,
                budgetOrganizer: {
                  ...prev.budgetOrganizer,
                  items: prev.budgetOrganizer.items.map((item) =>
                    item.id === id ? { ...item, amount } : item
                  ),
                },
              }))
            }
            onAddBudgetItem={(label, amount) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: {
                    ...prev.budgetOrganizer,
                    items: [
                      ...prev.budgetOrganizer.items,
                      { id: `b_${nextId()}`, label, amount },
                    ],
                  },
                }),
                { toastText: `تمت إضافة «${label}» وخصمه من الميزانية`, chime: true }
              )
            }
            onDeleteBudgetItem={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  budgetOrganizer: {
                    ...prev.budgetOrganizer,
                    items: prev.budgetOrganizer.items.filter((item) => item.id !== id),
                  },
                }),
                { toastText: 'تم حذف البند من الميزانية', allowUndo: true }
              )
            }
            onRecordBudgetExpense={(item) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'family',
                      cat: 'exp',
                      type: 'out',
                      name: `بند الميزانية: ${item.label}`,
                      amount: item.amount,
                      person: prev.family[0] || '',
                    }),
                    ...prev.tx,
                  ],
                }),
                {
                  toastText: `تم تسجيل صرف «${item.label}» (${fmt(item.amount)}) في الخزينة`,
                  allowUndo: true,
                  chime: true,
                }
              )
            }
            onAddGoal={(name, target) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  goals: [{ id: nextId(), name, target, saved: 0 }, ...prev.goals],
                }),
                { toastText: `تمت إضافة حصّالة: ${name}` }
              )
            }
            onDepositGoal={(goal: Goal, presetAmount?: number) =>
              setModal({
                kind: 'input',
                title: `إيداع في حصّالة: ${goal.name}`,
                message: `المدخر حالياً ${fmt(goal.saved)} من أصل ${fmt(goal.target)}`,
                initialValue: presetAmount ? String(presetAmount) : undefined,
                placeholder: 'المبلغ (دج)',
                inputType: 'number',
                checkboxLabel: 'خصم المبلغ من الحساب العائلي',
                checkboxDefault: true,
                confirmLabel: 'إيداع',
                onSubmit: (val, deductTreasury) => {
                  const amt = Math.max(0, Number(val) || 0);
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      goals: prev.goals.map((g) =>
                        g.id === goal.id ? { ...g, saved: g.saved + amt } : g
                      ),
                      tx: deductTreasury
                        ? [
                            makeTransaction({
                              accountId: 'family',
                              cat: 'sav',
                              type: 'out',
                              name: `إيداع ادخار: ${goal.name}`,
                              amount: amt,
                            }),
                            ...prev.tx,
                          ]
                        : prev.tx,
                    }),
                    { toastText: `تم إيداع ${fmt(amt)} في ${goal.name}`, allowUndo: true, chime: true }
                  );
                },
              })
            }
            onWithdrawGoal={(goal: Goal) => {
              if (goal.saved <= 0) {
                showToast('الحصّالة فارغة حالياً');
                return;
              }
              setModal({
                kind: 'input',
                title: `سحب من حصّالة: ${goal.name}`,
                message: `الرصيد المتاح للسحب: ${fmt(goal.saved)}`,
                initialValue: String(goal.saved),
                placeholder: 'المبلغ المسحوب (دج)',
                inputType: 'number',
                checkboxLabel: 'إضافة المبلغ المسحوب إلى الحساب العائلي',
                checkboxDefault: true,
                confirmLabel: 'تأكيد السحب',
                onSubmit: (val, creditTreasury) => {
                  const amt = Math.min(goal.saved, Math.max(0, Number(val) || 0));
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      goals: prev.goals.map((g) =>
                        g.id === goal.id ? { ...g, saved: Math.max(0, g.saved - amt) } : g
                      ),
                      tx: creditTreasury
                        ? [
                            makeTransaction({
                              accountId: 'family',
                              cat: 'inc',
                              type: 'in',
                              name: `سحب من حصّالة: ${goal.name}`,
                              amount: amt,
                            }),
                            ...prev.tx,
                          ]
                        : prev.tx,
                    }),
                    { toastText: `تم سحب ${fmt(amt)} من ${goal.name}`, allowUndo: true, chime: true }
                  );
                },
              });
            }}
            onDeleteGoal={(id) =>
              commitDB(
                (prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }),
                { toastText: 'تم حذف الحصّالة', allowUndo: true }
              )
            }
            onAddSeasonal={(payload) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  seasonalBudgets: [
                    {
                      id: nextId(),
                      name: payload.name,
                      occasionType: payload.occasionType,
                      emoji: payload.emoji,
                      targetAmount: payload.targetAmount,
                      savedAmount: 0,
                      targetDateIso: payload.targetDateIso,
                      notes: payload.notes,
                      createdAt: Date.now(),
                    },
                    ...prev.seasonalBudgets,
                  ],
                }),
                { toastText: `تمت إضافة ميزانية ${payload.name}` }
              )
            }
            onDepositSeasonal={(budget: SeasonalBudget) =>
              setModal({
                kind: 'input',
                title: `ادخار لموسم: ${budget.name}`,
                message: `المجموع حتى الآن: ${fmt(budget.savedAmount)} / ${fmt(budget.targetAmount)}`,
                placeholder: 'المبلغ (دج)',
                inputType: 'number',
                checkboxLabel: 'خصم المبلغ من الحساب العائلي',
                checkboxDefault: true,
                confirmLabel: 'إيداع',
                onSubmit: (val, deductTreasury) => {
                  const amt = Math.max(0, Number(val) || 0);
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      seasonalBudgets: prev.seasonalBudgets.map((b) =>
                        b.id === budget.id ? { ...b, savedAmount: b.savedAmount + amt } : b
                      ),
                      tx: deductTreasury
                        ? [
                            makeTransaction({
                              accountId: 'family',
                              cat: 'sav',
                              type: 'out',
                              name: `ادخار موسمي: ${budget.name}`,
                              amount: amt,
                            }),
                            ...prev.tx,
                          ]
                        : prev.tx,
                    }),
                    { toastText: `تم ادخار ${fmt(amt)} لـ ${budget.name}`, allowUndo: true, chime: true }
                  );
                },
              })
            }
            onDeleteSeasonal={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  seasonalBudgets: prev.seasonalBudgets.filter((b) => b.id !== id),
                }),
                { toastText: 'تم حذف الميزانية الموسمية', allowUndo: true }
              )
            }
            onUpdateBudgets={(groceryBudget, marketBudget) =>
              commitDB(
                (prev) => ({ ...prev, groceryBudget, marketBudget }),
                { toastText: 'تم تحديث حدود الميزانية الشهرية' }
              )
            }
          />
        )}

        {page === 'tailoring' && (
          <TailoringView
            db={db}
            onAddOrder={(order, stockDeductions) =>
              commitDB(
                (prev) => {
                  const deductMap = new Map<number, number>();
                  for (const d of stockDeductions) {
                    deductMap.set(d.stockId, (deductMap.get(d.stockId) || 0) + d.qty);
                  }
                  const nextMaterials =
                    deductMap.size > 0
                      ? prev.sewMaterials.map((m) => {
                          const q = deductMap.get(m.id);
                          return q ? { ...m, qty: Math.max(0, Number((m.qty - q).toFixed(2))) } : m;
                        })
                      : prev.sewMaterials;
                  return {
                    ...prev,
                    sewMaterials: nextMaterials,
                    orders: [
                      { ...order, id: nextId(), date: todayLabel(), ym: currentYM() },
                      ...prev.orders,
                    ],
                    tx:
                      order.paid > 0
                        ? [
                            makeTransaction({
                              accountId: 'sewing',
                              cat: 'inc',
                              type: 'in',
                              name: `عربون خياطة: ${order.client} (${order.model})`,
                              amount: order.paid,
                            }),
                            ...prev.tx,
                          ]
                        : prev.tx,
                  };
                },
                { toastText: `تم تسجيل طلبية ${order.client}`, allowUndo: true, chime: true }
              )
            }
            onUpdateStage={(id: number, stage: OrderStage) =>
              commitDB((prev) => ({
                ...prev,
                orders: prev.orders.map((o) => (o.id === id ? { ...o, stage } : o)),
              }))
            }
            onCollectOrderPayment={(order: SewingOrder) => {
              const rem = Math.max(0, order.price - order.paid);
              setModal({
                kind: 'input',
                title: `تحصيل دفعة — ${order.client}`,
                message: `المتبقي للطلبية: ${fmt(rem)}`,
                initialValue: String(rem),
                inputType: 'number',
                confirmLabel: 'تحصيل لحساب الخياطة',
                onSubmit: (val) => {
                  const amt = Math.min(rem, Math.max(0, Number(val) || 0));
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      orders: prev.orders.map((o) =>
                        o.id === order.id ? { ...o, paid: o.paid + amt } : o
                      ),
                      tx: [
                        makeTransaction({
                          accountId: 'sewing',
                          cat: 'inc',
                          type: 'in',
                          name: `دفعة طلبية: ${order.client} (${order.model})`,
                          amount: amt,
                        }),
                        ...prev.tx,
                      ],
                    }),
                    { toastText: `تم تحصيل ${fmt(amt)} لحساب الخياطة`, allowUndo: true, chime: true }
                  );
                },
              });
            }}
            onDeleteOrder={(id) =>
              commitDB(
                (prev) => ({ ...prev, orders: prev.orders.filter((o) => o.id !== id) }),
                { toastText: 'تم حذف الطلبية', allowUndo: true }
              )
            }
            onPreviewPhoto={(src, title) => setPreviewPhoto({ src, title })}
            onAddMeasurement={(m) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  measurements: [
                    { ...m, id: nextId(), date: todayLabel() },
                    ...(prev.measurements || []),
                  ],
                }),
                { toastText: `تم حفظ مقاسات ${m.name}`, chime: true }
              )
            }
            onDeleteMeasurement={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  measurements: (prev.measurements || []).filter((m) => m.id !== id),
                }),
                { toastText: 'تم حذف سجل المقاسات', allowUndo: true }
              )
            }
            onAddSewService={(s) =>
              commitDB(
                (prev) => {
                  const extraTx = [];
                  if (s.paid > 0) {
                    extraTx.push(
                      makeTransaction({
                        accountId: 'sewing',
                        cat: 'inc',
                        type: 'in',
                        name: `خدمة خياطة: ${s.client} (${s.item})`,
                        amount: s.paid,
                      })
                    );
                  }
                  const matCost = s.thread + s.supplies;
                  if (matCost > 0) {
                    extraTx.push(
                      makeTransaction({
                        accountId: 'sewing',
                        cat: 'exp',
                        type: 'out',
                        name: `خيط ولوازم خدمة: ${s.client} (${s.item})`,
                        amount: matCost,
                      })
                    );
                  }
                  return {
                    ...prev,
                    sewServices: [
                      { ...s, id: nextId(), date: todayLabel(), ym: currentYM() },
                      ...(prev.sewServices || []),
                    ],
                    tx: [...extraTx, ...prev.tx],
                  };
                },
                { toastText: `تم تسجيل خدمة ${s.client}`, allowUndo: true, chime: true }
              )
            }
            onDeleteSewService={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  sewServices: (prev.sewServices || []).filter((s) => s.id !== id),
                }),
                { toastText: 'تم حذف الخدمة', allowUndo: true }
              )
            }
            onAddSewMaterial={(m) =>
              commitDB(
                (prev) => {
                  const list = prev.sewMaterials || [];
                  const existing = list.find(
                    (x) =>
                      x.name.trim().toLowerCase() === m.name.trim().toLowerCase() &&
                      x.unit === m.unit
                  );
                  if (existing) {
                    const totalQty = existing.qty + m.qty;
                    const avgCost =
                      totalQty > 0
                        ? Math.round((existing.qty * existing.cost + m.qty * m.cost) / totalQty)
                        : m.cost;
                    return {
                      ...prev,
                      sewMaterials: list.map((x) =>
                        x.id === existing.id
                          ? {
                              ...x,
                              qty: Number(totalQty.toFixed(2)),
                              cost: avgCost,
                              min: m.min,
                              date: todayLabel(),
                            }
                          : x
                      ),
                    };
                  }
                  return {
                    ...prev,
                    sewMaterials: [{ ...m, id: nextId(), date: todayLabel() }, ...list],
                  };
                },
                { toastText: `تمت إضافة «${m.name}» لمخزون الورشة`, chime: true }
              )
            }
            onUseSewMaterial={(mat: SewMaterial) =>
              setModal({
                kind: 'input',
                title: `استعمال من المخزون — ${mat.name}`,
                message: `المتوفر حالياً: ${mat.qty} ${mat.unit} (تكلفة الوحدة ${fmt(mat.cost)})`,
                initialValue: String(Math.min(1, mat.qty)),
                inputType: 'number',
                confirmLabel: 'تأكيد الاستهلاك',
                onSubmit: (val) => {
                  const used = Math.min(mat.qty, Math.max(0, Number(val) || 0));
                  if (used <= 0) return;
                  const costAmt = Math.round(used * mat.cost);
                  commitDB(
                    (prev) => ({
                      ...prev,
                      sewMaterials: (prev.sewMaterials || []).map((x) =>
                        x.id === mat.id
                          ? { ...x, qty: Math.max(0, Number((x.qty - used).toFixed(2))) }
                          : x
                      ),
                      tx:
                        costAmt > 0
                          ? [
                              makeTransaction({
                                accountId: 'sewing',
                                cat: 'exp',
                                type: 'out',
                                name: `استهلاك مخزون: ${mat.name} (${used} ${mat.unit})`,
                                amount: costAmt,
                              }),
                              ...prev.tx,
                            ]
                          : prev.tx,
                    }),
                    {
                      toastText: `تم سحب ${used} ${mat.unit} من ${mat.name}`,
                      allowUndo: true,
                      chime: true,
                    }
                  );
                },
              })
            }
            onDeleteSewMaterial={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  sewMaterials: (prev.sewMaterials || []).filter((m) => m.id !== id),
                }),
                { toastText: 'تم حذف المادة من المخزون', allowUndo: true }
              )
            }
            onAddSewProject={(p) =>
              commitDB(
                (prev) => {
                  const extraTx = [];
                  if (p.paid > 0) {
                    extraTx.push(
                      makeTransaction({
                        accountId: 'sewing',
                        cat: 'inc',
                        type: 'in',
                        name: `مبيعات مشروع: ${p.name}`,
                        amount: p.paid,
                      })
                    );
                  }
                  const totalCost = p.fabric + p.supplies + p.other;
                  if (totalCost > 0) {
                    extraTx.push(
                      makeTransaction({
                        accountId: 'sewing',
                        cat: 'exp',
                        type: 'out',
                        name: `تكاليف مشروع: ${p.name}`,
                        amount: totalCost,
                      })
                    );
                  }
                  return {
                    ...prev,
                    sewProjects: [
                      { ...p, id: nextId(), date: todayLabel(), ym: currentYM() },
                      ...(prev.sewProjects || []),
                    ],
                    tx: [...extraTx, ...prev.tx],
                  };
                },
                { toastText: `تم حفظ مشروع «${p.name}»`, allowUndo: true, chime: true }
              )
            }
            onDeleteSewProject={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  sewProjects: (prev.sewProjects || []).filter((p) => p.id !== id),
                }),
                { toastText: 'تم حذف المشروع', allowUndo: true }
              )
            }
            onSewCashMovement={(type, name, amount) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'sewing',
                      cat: type === 'in' ? 'inc' : 'exp',
                      type,
                      name,
                      amount,
                    }),
                    ...prev.tx,
                  ],
                }),
                { toastText: `تم تسجيل ${name} (${fmt(amount)})`, allowUndo: true, chime: true }
              )
            }
            onTransferSewingToFamily={(amount) => {
              const transferId = nextId();
              commitDB(
                (prev) => ({
                  ...prev,
                  tx: [
                    makeTransaction({
                      accountId: 'family',
                      cat: 'transfer',
                      type: 'in',
                      name: 'تحويل من صندوق الخياطة (وارد)',
                      amount,
                      transferId,
                      transferFromAccountId: 'sewing',
                      transferToAccountId: 'family',
                    }),
                    makeTransaction({
                      accountId: 'sewing',
                      cat: 'transfer',
                      type: 'out',
                      name: 'تحويل إلى الخزينة العائلية (صادر)',
                      amount,
                      transferId,
                      transferFromAccountId: 'sewing',
                      transferToAccountId: 'family',
                    }),
                    ...prev.tx,
                  ],
                }),
                {
                  toastText: `تم تحويل ${fmt(amount)} من الخياطة إلى العائلة`,
                  allowUndo: true,
                  chime: true,
                }
              );
            }}
            onAddSewDebt={(d) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  debts: [
                    { ...d, id: nextId(), paid: 0, date: todayLabel(), ym: currentYM() },
                    ...(prev.debts || []),
                  ],
                }),
                { toastText: `تم تسجيل دين الورشة: ${d.name}`, allowUndo: true, chime: true }
              )
            }
            onPaySewDebt={(d: SewDebtRecord) => {
              const rem = Math.max(0, d.amount - d.paid);
              setModal({
                kind: 'input',
                title: `${d.type === 'in' ? 'تحصيل مستحق' : 'تسديد دين'} — ${d.name}`,
                message: `المتبقي حالياً: ${fmt(rem)}`,
                initialValue: String(rem),
                inputType: 'number',
                checkboxLabel: 'تسجيل الحركة في صندوق الخياطة',
                checkboxDefault: true,
                confirmLabel: 'تأكيد الدفعة',
                onSubmit: (val, applyCashbox) => {
                  const amt = Math.min(rem, Math.max(0, Number(val) || 0));
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      debts: (prev.debts || []).map((x) =>
                        x.id === d.id ? { ...x, paid: x.paid + amt } : x
                      ),
                      tx: applyCashbox
                        ? [
                            makeTransaction({
                              accountId: 'sewing',
                              cat: d.type === 'in' ? 'inc' : 'debt_payment',
                              type: d.type,
                              name: `${d.type === 'in' ? 'تحصيل مستحق ورشة' : 'تسديد دين ورشة'}: ${d.name}`,
                              amount: amt,
                            }),
                            ...prev.tx,
                          ]
                        : prev.tx,
                    }),
                    {
                      toastText: `تم تسجيل ${fmt(amt)} لـ ${d.name}`,
                      allowUndo: true,
                      chime: true,
                    }
                  );
                },
              });
            }}
            onDeleteSewDebt={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  debts: (prev.debts || []).filter((d) => d.id !== id),
                }),
                { toastText: 'تم حذف سجل دين الورشة', allowUndo: true }
              )
            }
          />
        )}

        {page === 'reports' && (
          <ReportsView
            db={db}
            onDeleteTransaction={(id) =>
              commitDB(
                (prev) => ({ ...prev, tx: prev.tx.filter((t) => t.id !== id) }),
                { toastText: 'تم حذف العملية', allowUndo: true }
              )
            }
            onOpenMonthClose={() => setMonthCloseOpen(true)}
            onNotify={showToast}
          />
        )}

        {page === 'tools' && (
          <ToolsSettingsView
            db={db}
            onPreviewPhoto={(src, title) => setPreviewPhoto({ src, title })}
            onAddWarranty={(w) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  warranties: [{ ...w, id: nextId(), createdAt: Date.now() }, ...prev.warranties],
                }),
                { toastText: `تم حفظ ضمان ${w.deviceName}`, chime: true }
              )
            }
            onDeleteWarranty={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  warranties: prev.warranties.filter((w) => w.id !== id),
                }),
                { toastText: 'تم حذف الضمان', allowUndo: true }
              )
            }
            onAddFamilyMember={(name) =>
              commitDB((prev) => {
                if (prev.family.includes(name)) return prev;
                return { ...prev, family: [...prev.family, name] };
              })
            }
            onRemoveFamilyMember={(name) =>
              commitDB((prev) => {
                if (prev.family.length <= 1) return prev;
                const nextFam = prev.family.filter((m) => m !== name);
                return {
                  ...prev,
                  family: nextFam,
                  activeFamilyMember:
                    prev.activeFamilyMember === name ? nextFam[0] : prev.activeFamilyMember,
                };
              })
            }
            onEnableFamilyMode={() =>
              commitDB((prev) => ({ ...prev, familyEntryOnlyMode: true }))
            }
            onChangePin={async (newPin) => {
              const hashed = await hashPinSha256(newPin);
              commitDB(
                (prev) => ({ ...prev, pin: hashed }),
                { toastText: 'تم تحديث الرمز السري وتشفيره بنجاح' }
              );
            }}
            onToggleDarkMode={() =>
              commitDB((prev) => ({ ...prev, darkMode: !prev.darkMode }))
            }
            onToggleSound={() =>
              commitDB((prev) => ({ ...prev, sound: !prev.sound }))
            }
            onToggleAppLock={() =>
              commitDB(
                (prev) => {
                  const nextVal = !prev.appLockEnabled;
                  return { ...prev, appLockEnabled: nextVal };
                },
                {
                  toastText: db.appLockEnabled
                    ? 'تم تعطيل قفل التطبيق عند الفتح'
                    : 'تم تفعيل قفل التطبيق بالرمز السري عند الفتح',
                }
              )
            }
            onLockNow={() => setIsAppLocked(true)}
            onAddQuickExpense={(title, amount, emoji) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  quickExpenses: [
                    ...prev.quickExpenses,
                    { id: `qe_${nextId()}`, title, amount, emoji },
                  ],
                }),
                { toastText: `تمت إضافة الزر السريع «${title}»` }
              )
            }
            onDeleteQuickExpense={(id) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  quickExpenses: prev.quickExpenses.filter((q) => q.id !== id),
                }),
                { toastText: 'تم حذف الزر السريع', allowUndo: true }
              )
            }
            onAddAccountBook={(kind, name, phone, note) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  accountsBook: [
                    {
                      id: nextId(),
                      kind,
                      name,
                      phone: phone || undefined,
                      note: note || undefined,
                      entries: [],
                    },
                    ...(prev.accountsBook || []),
                  ],
                }),
                { toastText: `تمت إضافة حساب «${name}»`, chime: true }
              )
            }
            onAddAccountBookEntry={(accountId, sign, defaultLabel) => {
              const acc = (db.accountsBook || []).find((a) => a.id === accountId);
              if (!acc) return;
              setModal({
                kind: 'input',
                title: `${defaultLabel} — ${acc.name}`,
                message:
                  sign > 0
                    ? 'سجّل المبلغ الجديد على هذا الحساب:'
                    : 'سجّل مبلغ الدفعة / التسديد:',
                placeholder: 'المبلغ (دج)',
                inputType: 'number',
                confirmLabel: defaultLabel,
                onSubmit: (val) => {
                  const amt = Math.max(0, Number(val) || 0);
                  if (amt <= 0) return;
                  commitDB(
                    (prev) => ({
                      ...prev,
                      accountsBook: (prev.accountsBook || []).map((a) =>
                        a.id === accountId
                          ? {
                              ...a,
                              entries: [
                                {
                                  id: nextId(),
                                  delta: sign * amt,
                                  note: defaultLabel,
                                  date: todayLabel(),
                                  ym: currentYM(),
                                },
                                ...a.entries,
                              ],
                            }
                          : a
                      ),
                    }),
                    { toastText: `تم تسجيل ${fmt(amt)} في حساب ${acc.name}`, allowUndo: true, chime: true }
                  );
                },
              });
            }}
            onDeleteAccountBook={(accountId) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  accountsBook: (prev.accountsBook || []).filter((a) => a.id !== accountId),
                }),
                { toastText: 'تم حذف الحساب', allowUndo: true }
              )
            }
            onUpdateSewingRates={(meterPrice, threadPrice) =>
              commitDB(
                (prev) => ({ ...prev, meterPrice, threadPrice }),
                { toastText: 'تم حفظ أسعار الخياطة الافتراضية', chime: true }
              )
            }
            onAddCatalogProduct={(group, name, emoji) =>
              commitDB(
                (prev) => ({
                  ...prev,
                  catalog: [
                    ...prev.catalog,
                    { id: nextId(), name, group, price: 0, unit: 'حبة', emoji },
                  ],
                }),
                { toastText: `تمت إضافة «${name}» للكتالوج` }
              )
            }
            onSelectiveReset={(sections) => {
              if (!Object.values(sections).some(Boolean)) {
                showToast('اختر قسماً واحداً على الأقل للتصفير');
                return;
              }
              setModal({
                kind: 'confirm',
                title: 'تأكيد التصفير الاختياري',
                message: 'سيتم تصفير الأقسام التي اخترتها فقط مع الحفاظ على باقي البيانات. هل أنت متأكد؟',
                confirmLabel: 'تصفير المحدد',
                danger: true,
                onConfirm: () => {
                  const ym = currentYM();
                  commitDB(
                    (prev) => {
                      const nextMonthSalaries = { ...prev.monthSalaries };
                      if (sections.salary) {
                        nextMonthSalaries[ym] = { s1: 0, s2: 0 };
                      }
                      const nextTx = prev.tx.filter((t) => {
                        const acc = transactionAccount(t);
                        if (sections.homeTx && acc === 'family' && getTxYM(t) === ym) return false;
                        if (sections.sewing && acc === 'sewing') return false;
                        return true;
                      });
                      return {
                        ...prev,
                        s1: sections.salary ? 0 : prev.s1,
                        s2: sections.salary ? 0 : prev.s2,
                        monthSalaries: nextMonthSalaries,
                        tx: nextTx,
                        accounts: sections.sewing
                          ? {
                              ...prev.accounts,
                              sewing: { ...prev.accounts.sewing, openingBalance: 0 },
                            }
                          : prev.accounts,
                        homeDebts: sections.homeDebts ? [] : prev.homeDebts,
                        debts: sections.sewingDebts ? [] : prev.debts,
                      };
                    },
                    { toastText: 'تم تصفير الأقسام المحددة بنجاح', allowUndo: true }
                  );
                },
              });
            }}
            onExportBackup={() => {
              const json = JSON.stringify(db, null, 2);
              const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `sandooqi-backup-${localDateISO()}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('تم تنزيل النسخة الاحتياطية بنجاح');
            }}
            onImportBackup={async (file) => {
              try {
                const raw = await file.text();
                const parsed = JSON.parse(raw) as Partial<SandooqiDB>;
                const normalized = normalizeSandooqiDB(parsed);
                await saveSandooqiDB(normalized);
                setDb(normalized);
                showToast('تم استيراد النسخة الاحتياطية بنجاح');
              } catch {
                showToast('ملف النسخة الاحتياطية غير صالح');
              }
            }}
            onResetAll={() =>
              setModal({
                kind: 'confirm',
                title: 'تصفير جميع البيانات',
                message: 'سيتم مسح جميع العمليات والديون والأهداف والعودة للحالة الافتراضية. هل أنت متأكد؟',
                confirmLabel: 'تصفير الآن',
                danger: true,
                onConfirm: () => {
                  const fresh = createDefaultDB();
                  saveSandooqiDB(fresh).catch(() => undefined);
                  setDb(fresh);
                  showToast('تم تصفير البيانات وإعادة الضبط');
                },
              })
            }
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="no-print safe-bottom fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95 md:hidden">
        <div className="grid grid-cols-4 gap-0.5 px-1 py-1 sm:grid-cols-8">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[10px] font-bold ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="mb-0.5 h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick Add Floating Action Button */}
      <QuickAddFab
        db={db}
        onNavigate={setPage}
        onQuickCashExpense={(title, amount, person) =>
          commitDB(
            (prev) => ({
              ...prev,
              tx: [
                makeTransaction({
                  accountId: 'family',
                  cat: 'exp',
                  type: 'out',
                  name: title,
                  amount,
                  person: person || prev.family[0] || '',
                }),
                ...prev.tx,
              ],
            }),
            { toastText: `تم خصم ${title} (${fmt(amount)})`, allowUndo: true, chime: true }
          )
        }
        onQuickStoreDebt={(creditor, item, amount, due) =>
          commitDB(
            (prev) => ({
              ...prev,
              homeDebts: [
                {
                  id: nextId(),
                  creditor,
                  item,
                  activity: 'مشتريات',
                  amount,
                  paid: 0,
                  payments: [],
                  due: due || undefined,
                  date: todayLabel(),
                  ym: currentYM(),
                  direction: 'out',
                },
                ...prev.homeDebts,
              ],
            }),
            { toastText: `تم تسجيل دين لـ ${creditor} (${fmt(amount)})`, allowUndo: true, chime: true }
          )
        }
        onQuickMovement={(accountId, type, name, amount) =>
          commitDB(
            (prev) => ({
              ...prev,
              tx: [
                makeTransaction({
                  accountId,
                  cat: type === 'in' ? 'inc' : 'exp',
                  type,
                  name,
                  amount,
                }),
                ...prev.tx,
              ],
            }),
            { toastText: `تم تسجيل ${name} (${fmt(amount)})`, allowUndo: true, chime: true }
          )
        }
      />

      {/* Dialog Modal */}
      <DialogModal request={modal} onClose={() => setModal(null)} />

      {/* Voice Entry Modal */}
      <VoiceEntryModal
        open={voiceOpen}
        familyEntryOnlyMode={false}
        creditorNames={creditorNames}
        onClose={() => setVoiceOpen(false)}
        onSave={({ mode, title, amount, party, applyNow }) => {
          if (mode === 'cash') {
            commitDB(
              (prev) => ({
                ...prev,
                tx: [
                  makeTransaction({
                    accountId: 'family',
                    cat: 'exp',
                    type: 'out',
                    name: title,
                    amount,
                    person: prev.family[0] || '',
                  }),
                  ...prev.tx,
                ],
              }),
              { toastText: `تم تسجيل ${title} (${fmt(amount)})`, allowUndo: true, chime: true }
            );
          } else if (mode === 'in') {
            commitDB(
              (prev) => {
                const tx = applyNow
                  ? makeTransaction({
                      accountId: 'family',
                      cat: 'rent',
                      type: 'in',
                      name: `${title}${party ? ` (${party})` : ''}`,
                      amount,
                    })
                  : null;
                return {
                  ...prev,
                  tx: tx ? [tx, ...prev.tx] : prev.tx,
                  rentDebts: [
                    {
                      id: nextId(),
                      direction: 'in',
                      unit: 'مستحق شخصي',
                      party: party || title,
                      amount,
                      paid: applyNow ? amount : 0,
                      settled: applyNow,
                      treasuryApplied: applyNow,
                      transactionId: tx ? tx.id : null,
                      date: todayLabel(),
                      ym: currentYM(),
                    },
                    ...prev.rentDebts,
                  ],
                };
              },
              { toastText: `تم تسجيل مستحق لـ ${party || title}`, allowUndo: true, chime: true }
            );
          } else {
            commitDB(
              (prev) => {
                const creditorName = party || 'محل';
                return {
                  ...prev,
                  homeDebts: [
                    {
                      id: nextId(),
                      creditor: creditorName,
                      item: title,
                      activity: 'تسجيل صوتي',
                      amount,
                      paid: applyNow ? amount : 0,
                      payments: applyNow
                        ? [{ amount, ym: currentYM(), date: todayLabel() }]
                        : [],
                      date: todayLabel(),
                      ym: currentYM(),
                      direction: 'out',
                    },
                    ...prev.homeDebts,
                  ],
                  tx: applyNow
                    ? [
                        makeTransaction({
                          accountId: 'family',
                          cat: 'debt_payment',
                          type: 'out',
                          name: `تسديد فوري: ${creditorName} (${title})`,
                          amount,
                        }),
                        ...prev.tx,
                      ]
                    : prev.tx,
                };
              },
              { toastText: `تم تسجيل الدين عند ${party || 'محل'}`, allowUndo: true, chime: true }
            );
          }
        }}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        open={searchOpen}
        db={db}
        onClose={() => setSearchOpen(false)}
        onNavigate={setPage}
      />

      {/* Month Close Modal */}
      {monthCloseOpen && monthCloseInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <CalendarCheck className="h-4 w-4 text-emerald-600" />
                <span>إغلاق شهر {formatYM(monthCloseInfo.sourceMonth)}</span>
              </h3>
              <button
                type="button"
                onClick={() => setMonthCloseOpen(false)}
                aria-label="إغلاق"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
              <div className="flex justify-between">
                <span>فائض الحساب العائلي:</span>
                <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmt(monthCloseInfo.closing)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>الشهر المستهدف للترحيل:</span>
                <strong>{formatYM(monthCloseInfo.targetMonth)}</strong>
              </div>
            </div>

            {monthCloseInfo.closing > 0 && db.goals.length > 0 && (
              <div className="mt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  نسبة التحويل إلى الحصّالة قبل الترحيل ({savePct}% ={' '}
                  {fmt(Math.round((monthCloseInfo.closing * savePct) / 100))})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={savePct}
                  onChange={(e) => setSavePct(Number(e.target.value))}
                  className="w-full accent-emerald-700"
                />
                <select
                  value={targetGoalId || db.goals[0].id}
                  onChange={(e) => setTargetGoalId(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  {db.goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMonthCloseOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const closing = monthCloseInfo.closing;
                  const savedToGoal =
                    closing > 0 && db.goals.length > 0
                      ? Math.round((closing * savePct) / 100)
                      : 0;
                  const carriedForward = Math.max(0, closing - savedToGoal);
                  const chosenGoalId = targetGoalId || db.goals[0]?.id;

                  commitDB(
                    (prev) => ({
                      ...prev,
                      goals:
                        savedToGoal > 0 && chosenGoalId
                          ? prev.goals.map((g) =>
                              g.id === chosenGoalId ? { ...g, saved: g.saved + savedToGoal } : g
                            )
                          : prev.goals,
                      monthCarryovers: {
                        ...prev.monthCarryovers,
                        [monthCloseInfo.targetMonth]: carriedForward,
                      },
                      monthArchive: {
                        ...prev.monthArchive,
                        [monthCloseInfo.sourceMonth]: {
                          ym: monthCloseInfo.sourceMonth,
                          targetMonth: monthCloseInfo.targetMonth,
                          salary1: monthCloseInfo.report.salary.s1,
                          salary2: monthCloseInfo.report.salary.s2,
                          carryIn: monthCloseInfo.report.home.opening,
                          otherIncome:
                            monthCloseInfo.report.home.income -
                            (monthCloseInfo.report.salary.s1 + monthCloseInfo.report.salary.s2),
                          expenses: monthCloseInfo.report.home.out,
                          closingBalance: closing,
                          savedToGoal,
                          carriedForward,
                          closedAt: new Date().toISOString(),
                        },
                      },
                      monthClosePending: prev.monthClosePending.filter(
                        (p) => p.month !== monthCloseInfo.sourceMonth
                      ),
                    }),
                    {
                      toastText: `تم إغلاق ${formatYM(monthCloseInfo.sourceMonth)} وترحيل ${fmt(carriedForward)}`,
                      chime: true,
                    }
                  );
                  setMonthCloseOpen(false);
                }}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                تأكيد إغلاق الشهر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">{previewPhoto.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="إغلاق"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <img
              src={previewPhoto.src}
              alt={previewPhoto.title}
              className="max-h-[72vh] w-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Toast & Undo Notification */}
      {toast && (
        <div className="no-print fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg dark:bg-slate-800 md:bottom-6">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-slate-950 hover:bg-amber-300"
            >
              <RotateCcw className="h-3 w-3" />
              تراجع
            </button>
          )}
        </div>
      )}
    </div>
  );
}
