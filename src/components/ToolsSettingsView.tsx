import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Calculator,
  Camera,
  Database,
  Download,
  Lock,
  Moon,
  Plus,
  Scissors,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { AccountBookEntry, SandooqiDB } from '../types/sandooqi';
import {
  computeCashReportForMonth,
  currentYM,
  daysUntil,
  fmt,
  formatYM,
  getTxYM,
  localDateISO,
  shiftYM,
} from '../utils/finance';
import { compressImageFile, estimateStorageUsage } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface ToolsSettingsViewProps {
  db: SandooqiDB;
  onAddWarranty: (payload: {
    deviceName: string;
    category: string;
    shopOrBrand: string;
    purchaseDateIso: string;
    warrantyEndDateIso: string;
    cost: number;
    photoData: string;
  }) => void;
  onDeleteWarranty: (id: number) => void;
  onPreviewPhoto: (src: string, title: string) => void;
  onAddFamilyMember: (name: string) => void;
  onRemoveFamilyMember: (name: string) => void;
  onEnableFamilyMode: () => void;
  onChangePin: (newPin: string) => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAll: () => void;
  // Restored V12 capabilities:
  onAddQuickExpense: (title: string, amount: number, emoji: string) => void;
  onDeleteQuickExpense: (id: string) => void;
  onAddAccountBook: (kind: 'customer' | 'supplier', name: string, phone: string, note: string) => void;
  onAddAccountBookEntry: (accountId: number, delta: number, note: string) => void;
  onDeleteAccountBook: (accountId: number) => void;
  onUpdateSewingRates: (meterPrice: number, threadPrice: number) => void;
  onAddCatalogProduct: (group: string, name: string, emoji: string) => void;
  onSelectiveReset: (sections: {
    salary: boolean;
    homeTx: boolean;
    sewing: boolean;
    homeDebts: boolean;
    sewingDebts: boolean;
  }) => void;
  onToggleAppLock: () => void;
  onLockNow: () => void;
}

type ToolsTab = 'sim' | 'analytics' | 'accounts' | 'settings';

export const ToolsSettingsView: React.FC<ToolsSettingsViewProps> = ({
  db,
  onAddWarranty,
  onDeleteWarranty,
  onPreviewPhoto,
  onAddFamilyMember,
  onRemoveFamilyMember,
  onEnableFamilyMode,
  onChangePin,
  onToggleDarkMode,
  onToggleSound,
  onExportBackup,
  onImportBackup,
  onResetAll,
  onAddQuickExpense,
  onDeleteQuickExpense,
  onAddAccountBook,
  onAddAccountBookEntry,
  onDeleteAccountBook,
  onUpdateSewingRates,
  onAddCatalogProduct,
  onSelectiveReset,
  onToggleAppLock,
  onLockNow,
}) => {
  const [tab, setTab] = useState<ToolsTab>('sim');
  const ym = currentYM();
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  // Simulator state
  const [simName, setSimName] = useState('');
  const [simPrice, setSimPrice] = useState('');
  const [simSource, setSimSource] = useState<'home' | 'combined' | 'savings'>('home');

  // Quick expenses editor state
  const [qeTitle, setQeTitle] = useState('');
  const [qeAmt, setQeAmt] = useState('');
  const [qeEmoji, setQeEmoji] = useState('🛍️');

  // Analytics state
  const [faPerson, setFaPerson] = useState(db.family[0] || '');
  const [faMonth, setFaMonth] = useState(ym);
  const [miMonth, setMiMonth] = useState(ym);

  // Accounts Book state
  const [accKind, setAccKind] = useState<'customer' | 'supplier'>('customer');
  const [accName, setAccName] = useState('');
  const [accPhone, setAccPhone] = useState('');
  const [accNote, setAccNote] = useState('');
  const [accSearch, setAccSearch] = useState('');

  // Warranties state
  const [devName, setDevName] = useState('');
  const [warCat, setWarCat] = useState('أجهزة منزلية');
  const [warFilter, setWarFilter] = useState('الكل');
  const [brand, setBrand] = useState('');
  const [buyDate, setBuyDate] = useState(localDateISO());
  const [endDate, setEndDate] = useState('');
  const [cost, setCost] = useState('');
  const [photoData, setPhotoData] = useState('');

  // Settings state
  const [meterRate, setMeterRate] = useState(String(db.meterPrice));
  const [threadRate, setThreadRate] = useState(String(db.threadPrice));
  const [catGroup, setCatGroup] = useState('خضر');
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('🛍️');
  const [newMember, setNewMember] = useState('');
  const [newPin, setNewPin] = useState('');
  const [selReset, setSelReset] = useState({
    salary: false,
    homeTx: false,
    sewing: false,
    homeDebts: false,
    sewingDebts: false,
  });

  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number | null }>({
    usedBytes: 0,
    quotaBytes: null,
  });

  useEffect(() => {
    estimateStorageUsage().then(setStorageInfo);
  }, [db]);

  const handleWarrantyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    setPhotoData(compressed);
  };

  // Simulator calculation
  const curReport = useMemo(() => computeCashReportForMonth(db, ym), [db, ym]);
  const totalSaved = db.goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
  const simPool =
    simSource === 'home'
      ? curReport.home.balance
      : simSource === 'combined'
        ? curReport.home.balance + curReport.sewing.balance
        : curReport.home.balance + curReport.sewing.balance + totalSaved;
  const simCost = Math.max(0, Number(simPrice) || 0);
  const simAfter = simPool - simCost;

  // Family Member & Smoke analytics
  const memberStats = useMemo(() => {
    const curTx = db.tx.filter(
      (t) => getTxYM(t) === faMonth && t.type === 'out' && t.person === faPerson
    );
    const prevM = shiftYM(faMonth, -1);
    const prevSmoke = db.tx
      .filter(
        (t) =>
          getTxYM(t) === prevM &&
          t.type === 'out' &&
          t.person === faPerson &&
          t.name.includes('دخان')
      )
      .reduce((s, t) => s + t.amount, 0);
    const total = curTx.reduce((s, t) => s + t.amount, 0);
    const smoke = curTx
      .filter((t) => t.name.includes('دخان'))
      .reduce((s, t) => s + t.amount, 0);
    return { total, smoke, other: total - smoke, count: curTx.length, prevSmoke };
  }, [db.tx, faMonth, faPerson]);

  // Where did my money go?
  const whereMoneyWent = useMemo(() => {
    const rep = computeCashReportForMonth(db, miMonth);
    const catMap = new Map<string, number>();
    const dayMap = new Map<string, number>();
    for (const t of rep.arr) {
      if (t.type !== 'out' || t.cat === 'transfer' || t.cat === 'account_transfer') continue;
      if (t.source === 'credit-purchase' || t.cat === 'credit_purchase') continue;
      const key =
        t.cat === 'bill'
          ? 'الفواتير'
          : t.cat === 'fam'
            ? 'العائلة'
            : t.cat === 'fac'
              ? 'فاسيليتي'
              : t.cat === 'srv'
                ? 'خدمات'
                : t.cat === 'sav'
                  ? 'الادخار'
                  : t.cat === 'debt_payment'
                    ? 'تسديد الديون'
                    : t.accountId === 'sewing'
                      ? 'ورشة الخياطة'
                      : 'المشتريات المنزلية';
      catMap.set(key, (catMap.get(key) || 0) + t.amount);
      const dKey = t.dateISO || t.date;
      dayMap.set(dKey, (dayMap.get(dKey) || 0) + t.amount);
    }
    const top3 = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const daily = Array.from(dayMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return { rep, top3, daily };
  }, [db, miMonth]);

  // Accounts Book filtering
  const filteredAccounts = useMemo(() => {
    const q = accSearch.trim().toLowerCase();
    return (db.accountsBook || []).filter((a) => {
      if (a.kind !== accKind) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [db.accountsBook, accKind, accSearch]);

  const accountBalance = (a: AccountBookEntry) =>
    (a.entries || []).reduce((s, e) => s + Number(e.delta || 0), 0);

  const filteredWarranties = db.warranties.filter(
    (w) => warFilter === 'الكل' || w.category === warFilter
  );

  const usedMb = (storageInfo.usedBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4">
      {/* 4 Sub-tabs */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        {(
          [
            ['sim', '🤔 المحاكي والسريع'],
            ['analytics', '📊 التحليلات'],
            ['accounts', '👥 الحسابات والضمانات'],
            ['settings', '⚙️ الإعدادات والأمان'],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`rounded-xl py-2 text-xs font-bold transition-colors ${
              tab === k
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* ================= TAB 1: AFFORDABILITY SIMULATOR & QUICK EXPENSES ================= */}
      {tab === 'sim' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Calculator className="h-4 w-4 text-sky-600" />
              <span>🤔 محاكي: هل أقدر أشتريه الآن؟</span>
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="الشيء الذي تفكر في شرائه..."
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={0}
                value={simPrice}
                onChange={(e) => setSimPrice(e.target.value)}
                placeholder="السعر المتوقع (دج)"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <select
                value={simSource}
                onChange={(e) => setSimSource(e.target.value as 'home' | 'combined' | 'savings')}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="home">صندوق البيت فقط</option>
                <option value="combined">صندوق البيت + الخياطة</option>
                <option value="savings">البيت + الخياطة + الادخار</option>
              </select>
            </div>

            {simCost > 0 && (
              <div
                className={`mt-3 rounded-xl border p-3 text-xs ${
                  simAfter >= simPool * 0.25
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : simAfter >= 0
                      ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                      : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
                }`}
              >
                <div className="font-bold">
                  {simAfter >= simPool * 0.25
                    ? `✅ نعم، يمكنك شراء «${simName || 'الغرض'}» بأمان.`
                    : simAfter >= 0
                      ? `⚠️ يمكنك شراؤه، لكن سيتبقى مبلغ محدود جداً في الصندوق.`
                      : `❌ غير مناسب الآن — المبلغ يفوق المتاح بـ ${fmt(Math.abs(simAfter))}.`}
                </div>
                <div className={`tabular-nums mt-1 ${blurCls}`}>
                  المتاح: {fmt(simPool)} · المتبقي بعد الشراء: {fmt(simAfter)}
                </div>
              </div>
            )}
          </section>

          {/* Quick 1-Tap Expense Presets Manager */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>⚡ تخصيص أزرار المصروف السريع (في الرئيسية)</span>
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(qeAmt);
                if (!qeTitle.trim() || !Number.isFinite(amt) || amt <= 0) return;
                onAddQuickExpense(qeTitle.trim(), amt, qeEmoji.trim() || '🛍️');
                setQeTitle('');
                setQeAmt('');
              }}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
            >
              <input
                type="text"
                value={qeEmoji}
                onChange={(e) => setQeEmoji(e.target.value)}
                placeholder="الأيقونة (🥖)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={qeTitle}
                onChange={(e) => setQeTitle(e.target.value)}
                placeholder="اسم المصروف السريع"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                required
                value={qeAmt}
                onChange={(e) => setQeAmt(e.target.value)}
                placeholder="المبلغ (دج)"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800"
              >
                + إضافة زر سريع
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {db.quickExpenses.map((q) => (
                <div
                  key={q.id}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                >
                  <span>
                    {q.emoji} {q.title} ({fmt(q.amount)})
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteQuickExpense(q.id)}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 2: ANALYTICS & WHERE DID MY MONEY GO ================= */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Users className="h-4 w-4 text-emerald-600" />
              <span>👨‍👩‍👦 مصاريف كل فرد ومتابعة الدخان</span>
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={faPerson}
                onChange={(e) => setFaPerson(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              >
                {db.family.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="month"
                value={faMonth}
                onChange={(e) => setFaMonth(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
                <div className="text-slate-500">مجموع الفرد</div>
                <strong className={`tabular-nums text-sm ${blurCls}`}>{fmt(memberStats.total)}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
                <div className="text-slate-500">مصروف الدخان</div>
                <strong className={`tabular-nums text-sm text-rose-600 ${blurCls}`}>
                  {fmt(memberStats.smoke)}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
                <div className="text-slate-500">باقي المصاريف</div>
                <strong className={`tabular-nums text-sm ${blurCls}`}>{fmt(memberStats.other)}</strong>
              </div>
              <div className="rounded-xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
                <div className="text-slate-500">الدخان (الشهر السابق)</div>
                <strong className={`tabular-nums text-sm ${blurCls}`}>{fmt(memberStats.prevSmoke)}</strong>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <BarChart3 className="h-4 w-4 text-sky-600" />
                <span>🧾 أين ذهبت أموالي؟ ({formatYM(miMonth)})</span>
              </h2>
              <input
                type="month"
                value={miMonth}
                onChange={(e) => setMiMonth(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-3 space-y-2">
              <h3 className="text-xs font-bold text-slate-500">أكثر ثلاثة أبواب استهلاكاً</h3>
              {whereMoneyWent.top3.length === 0 ? (
                <p className="text-xs text-slate-500">لا توجد بيانات لهذا الشهر.</p>
              ) : (
                whereMoneyWent.top3.map(([label, val], idx) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-800"
                  >
                    <strong>
                      {idx + 1}. {label}
                    </strong>
                    <span className={`tabular-nums font-bold text-rose-600 ${blurCls}`}>{fmt(val)}</span>
                  </div>
                ))
              )}
            </div>

            {whereMoneyWent.daily.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <h3 className="text-xs font-bold text-slate-500">ملخص المصاريف اليومية</h3>
                <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {whereMoneyWent.daily.map(([day, val]) => (
                    <div key={day} className="flex justify-between py-1.5 text-xs">
                      <span>{day}</span>
                      <strong className={`tabular-nums text-rose-600 ${blurCls}`}>{fmt(val)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= TAB 3: ACCOUNTS BOOK & WARRANTIES ================= */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          {/* Customer / Supplier Ledger */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">👥 دفتر حسابات الزبائن والموردين</h2>
              <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                {(
                  [
                    ['customer', 'الزبائن'],
                    ['supplier', 'الموردين'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAccKind(k)}
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      accKind === k
                        ? 'bg-white text-emerald-800 shadow-xs dark:bg-slate-900 dark:text-emerald-300'
                        : 'text-slate-500'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!accName.trim()) return;
                onAddAccountBook(accKind, accName.trim(), accPhone.trim(), accNote.trim());
                setAccName('');
                setAccPhone('');
                setAccNote('');
              }}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
            >
              <input
                type="text"
                required
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder={accKind === 'customer' ? 'اسم الزبون' : 'اسم المورد / المحل'}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="tel"
                value={accPhone}
                onChange={(e) => setAccPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                value={accNote}
                onChange={(e) => setAccNote(e.target.value)}
                placeholder="ملاحظة (اختياري)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white"
              >
                + إضافة الحساب
              </button>
            </form>

            <input
              type="search"
              value={accSearch}
              onChange={(e) => setAccSearch(e.target.value)}
              placeholder="بحث في الحسابات..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />

            <div className="mt-3 space-y-2">
              {filteredAccounts.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">لا توجد حسابات مسجلة.</p>
              ) : (
                filteredAccounts.map((acc) => {
                  const bal = accountBalance(acc);
                  return (
                    <div
                      key={acc.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <strong className="text-sm">{acc.name}</strong>
                        <div className="text-slate-500">
                          {acc.phone ? `${acc.phone} · ` : ''}
                          {acc.note || (acc.kind === 'customer' ? 'حساب زبون' : 'حساب مورد')}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`tabular-nums text-sm font-bold ${
                            bal > 0 ? 'text-rose-600' : 'text-emerald-700'
                          } ${blurCls}`}
                        >
                          {fmt(bal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onAddAccountBookEntry(acc.id, 1, 'إضافة')}
                          className="rounded-lg bg-sky-700 px-2.5 py-1 font-bold text-white"
                        >
                          + إضافة
                        </button>
                        <button
                          type="button"
                          onClick={() => onAddAccountBookEntry(acc.id, -1, 'تسديد')}
                          className="rounded-lg bg-emerald-700 px-2.5 py-1 font-bold text-white"
                        >
                          − تسديد
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAccountBook(acc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Warranties Archive with Category Filter */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>أرشيف ضمانات الأجهزة وقطع الغيار</span>
              </h2>
              <span className="tabular-nums text-xs font-semibold text-slate-500">
                {db.warranties.length} ملف
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!devName.trim()) return;
                onAddWarranty({
                  deviceName: devName.trim(),
                  category: warCat,
                  shopOrBrand: brand.trim(),
                  purchaseDateIso: buyDate,
                  warrantyEndDateIso: endDate,
                  cost: Math.max(0, Number(cost) || 0),
                  photoData,
                });
                setDevName('');
                setBrand('');
                setEndDate('');
                setCost('');
                setPhotoData('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  required
                  value={devName}
                  onChange={(e) => setDevName(e.target.value)}
                  placeholder="اسم الجهاز / آلة الخياطة / القطعة"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <select
                  value={warCat}
                  onChange={(e) => setWarCat(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="أجهزة منزلية">أجهزة منزلية</option>
                  <option value="آلات الخياطة">آلات الخياطة</option>
                  <option value="قطع غيار">قطع غيار</option>
                  <option value="أخرى">أخرى</option>
                </select>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="المحل أو الماركة"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    تاريخ الشراء
                  </label>
                  <input
                    type="date"
                    value={buyDate}
                    onChange={(e) => setBuyDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    انتهاء الضمان
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                    السعر (دج)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0"
                    className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700">
                  <Camera className="h-4 w-4" />
                  <span>{photoData ? 'تم إرفاق صورة الضمان ✓' : 'صورة الفاتورة / الضمان'}</span>
                  <input type="file" accept="image/*" onChange={handleWarrantyPhoto} className="hidden" />
                </label>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  حفظ في الأرشيف
                </button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['الكل', 'أجهزة منزلية', 'آلات الخياطة', 'قطع غيار'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setWarFilter(c)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    warFilter === c
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 text-slate-600 dark:border-slate-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWarranties.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">لا توجد ضمانات محفوظة بعد.</p>
              ) : (
                filteredWarranties.map((w) => {
                  const d = daysUntil(w.warrantyEndDateIso);
                  const status =
                    d === null
                      ? 'بدون تاريخ انتهاء'
                      : d < 0
                        ? 'منتهي الصلاحية'
                        : d <= 30
                          ? `ينتهي خلال ${d} يوم`
                          : `سارٍ (${d} يوم)`;
                  return (
                    <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="text-sm font-bold">{w.deviceName}</div>
                        <div className="text-xs text-slate-500">
                          {w.category}
                          {w.shopOrBrand ? ` · ${w.shopOrBrand}` : ''} · {status}
                          {w.cost > 0 ? ` · ${fmt(w.cost)}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {w.photoData && (
                          <button
                            type="button"
                            onClick={() => onPreviewPhoto(w.photoData, w.deviceName)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                          >
                            عرض الصورة
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteWarranty(w.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 4: SETTINGS, RATES, CATALOG, FAMILY & BACKUP ================= */}
      {tab === 'settings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Family Members & Restricted Mode */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-emerald-600" />
                <span>أفراد العائلة ووضع التسجيل المقيد</span>
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newMember.trim()) return;
                  onAddFamilyMember(newMember.trim());
                  setNewMember('');
                }}
                className="mt-3 flex gap-2"
              >
                <input
                  type="text"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  placeholder="إضافة اسم فرد جديد..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-4 w-4" />
                  إضافة
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {db.family.map((m) => (
                  <div
                    key={m}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <span>{m}</span>
                    {db.family.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveFamilyMember(m)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onEnableFamilyMode}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>تفعيل وضع أفراد العائلة (تسجيل المشتريات فقط)</span>
              </button>
            </section>

            {/* Default Sewing Rates & Add Product to Catalog */}
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Scissors className="h-4 w-4 text-violet-600" />
                  <span>الأسعار الافتراضية للخياطة</span>
                </h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onUpdateSewingRates(
                      Math.max(1, Number(meterRate) || 300),
                      Math.max(0, Number(threadRate) || 100)
                    );
                  }}
                  className="mt-2.5 grid grid-cols-3 gap-2"
                >
                  <input
                    type="number"
                    min={1}
                    value={meterRate}
                    onChange={(e) => setMeterRate(e.target.value)}
                    placeholder="سعر المتر"
                    className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    min={0}
                    value={threadRate}
                    onChange={(e) => setThreadRate(e.target.value)}
                    placeholder="سعر الخيط"
                    className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-violet-700 py-2 text-xs font-bold text-white"
                  >
                    حفظ التسعيرة
                  </button>
                </form>
              </div>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                <h3 className="text-xs font-bold">➕ إضافة صنف جديد لقائمة المنتجات</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!catName.trim()) return;
                    onAddCatalogProduct(catGroup, catName.trim(), catEmoji.trim() || '🛍️');
                    setCatName('');
                  }}
                  className="mt-2 grid grid-cols-4 gap-2"
                >
                  <select
                    value={catGroup}
                    onChange={(e) => setCatGroup(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="خضر">خضر</option>
                    <option value="فواكه">فواكه</option>
                    <option value="لحوم وأسماك">لحوم وأسماك</option>
                    <option value="مواد غذائية">مواد غذائية</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="اسم الصنف"
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={catEmoji}
                    onChange={(e) => setCatEmoji(e.target.value)}
                    placeholder="أيقونة"
                    className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-center text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white"
                  >
                    إضافة
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* PIN, Theme, Backup & Selective Reset */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Database className="h-4 w-4 text-sky-600" />
                <span>المظهر والأمان والنسخ الاحتياطي</span>
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
                >
                  {db.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{db.darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleSound}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
                >
                  {db.sound ? 'المؤثرات: مفعّلة' : 'المؤثرات: مكتومة'}
                </button>
                <PWAInstallButton />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <Lock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                      <span>قفل التطبيق بالرمز السري عند الفتح</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      يطلب الرمز السري عند تشغيل التطبيق لحماية بياناتك المالية.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAppLock}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                      db.appLockEnabled
                        ? 'bg-emerald-700 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    {db.appLockEnabled ? 'مفعّل ✓' : 'معطّل'}
                  </button>
                </div>
                {db.appLockEnabled && (
                  <button
                    type="button"
                    onClick={onLockNow}
                    className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-700/40 bg-emerald-700/10 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>قفل التطبيق الآن</span>
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newPin.trim().length < 4) return;
                  onChangePin(newPin.trim());
                  setNewPin('');
                }}
                className="flex gap-2"
              >
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="تغيير الرمز السري للمدير (4+ أرقام)"
                  className="tabular-nums flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-700"
                >
                  حفظ الرمز
                </button>
              </form>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50">
                <div className="flex justify-between font-semibold">
                  <span>التخزين المحلي (IndexedDB)</span>
                  <span className="tabular-nums">{usedMb} MB مستخدم</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onExportBackup}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تنزيل نسخة احتياطية JSON</span>
                </button>
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700">
                  <Upload className="h-3.5 w-3.5" />
                  <span>استيراد نسخة احتياطية</span>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onImportBackup(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            {/* Selective Section Reset */}
            <section className="space-y-3 rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-900/50 dark:bg-slate-900">
              <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                🧹 التصفير الاختياري للأقسام
              </h2>
              <p className="text-xs text-slate-500">
                اختر القسم الذي تريد تصفيره فقط دون المساس ببقية البيانات:
              </p>
              <div className="space-y-2 text-xs">
                {(
                  [
                    ['salary', 'الراتب الحالي (الشهر الحالي فقط)'],
                    ['homeTx', 'مصاريف ومدخول الصندوق المنزلي للشهر الحالي'],
                    ['sewing', 'حسابات الخياطة (المداخيل والمصاريف والتحويلات)'],
                    ['homeDebts', 'سجلات ديون المحلات والبيت'],
                    ['sewingDebts', 'سجلات ديون الورشة / الخياطة'],
                  ] as const
                ).map(([k, lbl]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={selReset[k]}
                      onChange={(e) =>
                        setSelReset((prev) => ({ ...prev, [k]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-rose-600"
                    />
                    <span>{lbl}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onSelectiveReset(selReset)}
                className="w-full rounded-xl bg-rose-600 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                تصفير الأقسام المحددة فقط
              </button>
              <button
                type="button"
                onClick={onResetAll}
                className="w-full rounded-xl border border-rose-300 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900"
              >
                🗑️ تصفير جميع البيانات بالكامل
              </button>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
