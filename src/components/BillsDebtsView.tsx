import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Filter,
  Home,
  Plus,
  Receipt,
  Search,
  Trash2,
} from 'lucide-react';
import { HomeDebt, SandooqiDB } from '../types/sandooqi';
import { currentYM, daysUntil, debtRemaining, fmt, formatYM, getTxYM } from '../utils/finance';
import { compressImageFile } from '../utils/storage';

interface BillsDebtsViewProps {
  db: SandooqiDB;
  onAddHomeDebt: (payload: {
    creditor: string;
    item: string;
    activity: string;
    amount: number;
    due: string;
    direction: 'in' | 'out';
    photo?: string;
  }) => void;
  onPayHomeDebt: (debt: HomeDebt) => void;
  onPayCreditorAll: (creditor: string, totalRemaining: number, direction?: 'in' | 'out') => void;
  onDeleteHomeDebt: (id: number) => void;
  onPreviewPhoto: (src: string, title: string) => void;
  onAddRentRecord: (payload: {
    direction: 'in' | 'out';
    unit: string;
    party: string;
    amount: number;
    due: string;
    immediate: boolean;
  }) => void;
  onCollectRent: (id: number) => void;
  onDeleteRent: (id: number) => void;
  onAddObligation: (payload: {
    name: string;
    amount: number;
    dueDay: number;
    creditor?: string;
    photo?: string;
  }) => void;
  onToggleObligationPaid: (id: number) => void;
  onDeleteObligation: (id: number) => void;
  onAddBillEntry: (payload: {
    name: string;
    amount: number;
    creditor: string;
    status: 'pending' | 'paid';
    due: string;
    unpaidMonths: number;
    recurring: boolean;
    photo?: string;
  }) => void;
  onAddSalaryDeduction: (payload: {
    facAmount: number;
    facNote: string;
    srvAmount: number;
    srvNote: string;
    srvMonth: string;
  }) => void;
  onDeleteTransaction: (id: number) => void;
  onAddFacPlan: (name: string, monthly: number, months: number) => void;
  onPayFacMonth: (id: number) => void;
  onDeleteFacPlan: (id: number) => void;
}

const DEBT_ACTIVITIES = [
  'مواد غذائية',
  'خضر',
  'دجاج ولحوم',
  'لباس',
  'دخان',
  'ماكياج',
  'كانكايري',
  'دواء',
  'توابل',
  'فواتير',
  'أخرى',
];

const BILL_PRESETS = [
  'فاتورة الغاز والكهرباء',
  'فاتورة الإنترنت',
  'فاتورة الكراء',
  'فاتورة الماء',
  'custom',
];

export const BillsDebtsView: React.FC<BillsDebtsViewProps> = ({
  db,
  onAddHomeDebt,
  onPayHomeDebt,
  onPayCreditorAll,
  onDeleteHomeDebt,
  onPreviewPhoto,
  onAddRentRecord,
  onCollectRent,
  onDeleteRent,
  onAddObligation,
  onToggleObligationPaid,
  onDeleteObligation,
  onAddBillEntry,
  onAddSalaryDeduction,
  onDeleteTransaction,
  onAddFacPlan,
  onPayFacMonth,
  onDeleteFacPlan,
}) => {
  const ym = currentYM();
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  const [tab, setTab] = useState<'debts' | 'bills' | 'deductions'>('debts');

  // === TAB 1: DEBTS & RENT ===
  const [showRentBox, setShowRentBox] = useState(false);
  const [rentDir, setRentDir] = useState<'in' | 'out'>('in');
  const [rentUnit, setRentUnit] = useState('كراء سكن');
  const [rentParty, setRentParty] = useState('');
  const [rentAmt, setRentAmt] = useState('');
  const [rentDue, setRentDue] = useState('');
  const [rentImmediate, setRentImmediate] = useState(true);
  const [rentFilter, setRentFilter] = useState<'all' | 'in' | 'out'>('all');

  const [debtSearch, setDebtSearch] = useState('');
  const [debtDirFilter, setDebtDirFilter] = useState<'all' | 'out' | 'in'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterActivity, setFilterActivity] = useState('all');
  const [sortBy, setSortBy] = useState<'balance' | 'name' | 'due'>('balance');
  const [expandedCreditors, setExpandedCreditors] = useState<Record<string, boolean>>({});

  // Add debt form (له / عليه)
  const [debtDir, setDebtDir] = useState<'out' | 'in'>('out');
  const [creditor, setCreditor] = useState('');
  const [item, setItem] = useState('');
  const [debtAmt, setDebtAmt] = useState('');
  const [debtDue, setDebtDue] = useState('');
  const [debtActivity, setDebtActivity] = useState('مواد غذائية');
  const [debtPhoto, setDebtPhoto] = useState('');

  // === TAB 2: BILLS & OBLIGATIONS ===
  const [oblName, setOblName] = useState('');
  const [oblAmt, setOblAmt] = useState('');
  const [oblDay, setOblDay] = useState('15');
  const [oblCreditor, setOblCreditor] = useState('');
  const [oblPhoto, setOblPhoto] = useState('');

  const [billType, setBillType] = useState('فاتورة الغاز والكهرباء');
  const [billCustomName, setBillCustomName] = useState('');
  const [billAmt, setBillAmt] = useState('');
  const [billCreditor, setBillCreditor] = useState('');
  const [billStatus, setBillStatus] = useState<'pending' | 'paid'>('pending');
  const [billDue, setBillDue] = useState('');
  const [billUnpaidMonths, setBillUnpaidMonths] = useState('1');
  const [billRecurring, setBillRecurring] = useState(false);
  const [billPhoto, setBillPhoto] = useState('');

  // === TAB 3: DEDUCTIONS & FAC PLANS ===
  const [facDedAmt, setFacDedAmt] = useState('');
  const [facDedNote, setFacDedNote] = useState('');
  const [srvDedAmt, setSrvDedAmt] = useState('');
  const [srvDedNote, setSrvDedNote] = useState('');
  const [srvDedMonth, setSrvDedMonth] = useState(ym);

  const [facName, setFacName] = useState('');
  const [facMonthly, setFacMonthly] = useState('');
  const [facMonths, setFacMonths] = useState('12');

  // Derived data for Tab 1
  const creditorChips = useMemo(
    () => Array.from(new Set(db.homeDebts.map((d) => d.creditor).filter(Boolean))),
    [db.homeDebts]
  );
  const debtMonths = useMemo(
    () => Array.from(new Set(db.homeDebts.map((d) => d.ym).filter(Boolean))).sort().reverse(),
    [db.homeDebts]
  );

  const groupedCreditors = useMemo(() => {
    const q = debtSearch.trim().toLowerCase();
    const map = new Map<
      string,
      {
        groupKey: string;
        creditor: string;
        direction: 'in' | 'out';
        activity: string;
        total: number;
        paid: number;
        remaining: number;
        nearestDue: string | null;
        items: HomeDebt[];
      }
    >();

    for (const d of db.homeDebts) {
      const dir: 'in' | 'out' = d.direction === 'in' ? 'in' : 'out';
      if (debtDirFilter !== 'all' && dir !== debtDirFilter) continue;
      if (filterMonth !== 'all' && d.ym !== filterMonth) continue;
      if (filterActivity !== 'all' && (d.activity || 'أخرى') !== filterActivity) continue;
      if (
        q &&
        !d.creditor.toLowerCase().includes(q) &&
        !d.item.toLowerCase().includes(q) &&
        !(d.activity || '').toLowerCase().includes(q)
      ) {
        continue;
      }
      const nameKey = d.creditor || 'غير محدد';
      const groupKey = `${dir}::${nameKey}`;
      const existing = map.get(groupKey) || {
        groupKey,
        creditor: nameKey,
        direction: dir,
        activity: d.activity || 'مواد غذائية',
        total: 0,
        paid: 0,
        remaining: 0,
        nearestDue: null,
        items: [],
      };
      existing.total += Number(d.amount) || 0;
      existing.paid += Number(d.paid) || 0;
      const rem = debtRemaining(d);
      existing.remaining += rem;
      if (rem > 0 && d.due && (!existing.nearestDue || d.due < existing.nearestDue)) {
        existing.nearestDue = d.due;
      }
      existing.items.push(d);
      map.set(groupKey, existing);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => {
      if (sortBy === 'name') return a.creditor.localeCompare(b.creditor, 'ar');
      if (sortBy === 'due') {
        if (!a.nearestDue && !b.nearestDue) return b.remaining - a.remaining;
        if (!a.nearestDue) return 1;
        if (!b.nearestDue) return -1;
        return a.nearestDue.localeCompare(b.nearestDue);
      }
      return b.remaining - a.remaining;
    });
    return list;
  }, [db.homeDebts, debtSearch, debtDirFilter, filterMonth, filterActivity, sortBy]);

  const totalOpenDebtOut = db.homeDebts
    .filter((d) => d.direction !== 'in')
    .reduce((s, d) => s + debtRemaining(d), 0);
  const totalOpenDebtIn = db.homeDebts
    .filter((d) => d.direction === 'in')
    .reduce((s, d) => s + debtRemaining(d), 0);
  const rentInPending = db.rentDebts
    .filter((r) => r.direction === 'in' && !r.settled)
    .reduce((s, r) => s + r.amount, 0);
  const rentOutPending = db.rentDebts
    .filter((r) => r.direction === 'out' && !r.settled)
    .reduce((s, r) => s + r.amount, 0);
  const filteredRent = db.rentDebts.filter((r) => rentFilter === 'all' || r.direction === rentFilter);

  const billDebts = db.homeDebts.filter(
    (d) => d.activity === 'فواتير' || d.item.includes('فاتورة')
  );
  const unpaidOblCount = db.obligations.filter((o) => !o.paidMonths?.includes(ym)).length;

  const monthlyDeductions = useMemo(
    () =>
      db.tx.filter(
        (t) => getTxYM(t) === ym && (t.cat === 'fac' || t.cat === 'srv')
      ),
    [db.tx, ym]
  );

  return (
    <div className="space-y-4">
      {/* 3 Sub-tabs */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            ['debts', `📒 الديون (${db.homeDebts.filter((d) => debtRemaining(d) > 0).length})`],
            ['bills', `🧾 الفواتير (${unpaidOblCount})`],
            ['deductions', `💳 الاقتطاعات (${db.facPlans.length})`],
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

      {/* ================= TAB 1: DEBTS & RENT ================= */}
      {tab === 'debts' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500">ديون مفتوحة (عليه)</div>
              <div className={`tabular-nums mt-1 text-base font-bold text-rose-600 ${blurCls}`}>
                {fmt(totalOpenDebtOut)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500">مستحقات وكراء (له)</div>
              <div className={`tabular-nums mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                {fmt(rentInPending + totalOpenDebtIn)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-semibold text-slate-500">كراء للدفع (عليه)</div>
              <div className={`tabular-nums mt-1 text-base font-bold text-amber-600 ${blurCls}`}>
                {fmt(rentOutPending)}
              </div>
            </div>
          </div>

          {/* Standalone Rent Section (كراء سكن و كراء محل لوحدهما مع له و عليه) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setShowRentBox((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-bold text-slate-900 dark:text-slate-100"
            >
              <span className="inline-flex items-center gap-2">
                <Home className="h-4 w-4 text-emerald-600" />
                <span>قسم الكراء (سكن / محل) — له وعليه ({db.rentDebts.length})</span>
              </span>
              {showRentBox ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showRentBox && (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amt = Number(rentAmt);
                    if (!rentParty.trim() || !Number.isFinite(amt) || amt <= 0) return;
                    onAddRentRecord({
                      direction: rentDir,
                      unit: rentUnit,
                      party: rentParty.trim(),
                      amount: amt,
                      due: rentDue,
                      immediate: rentImmediate,
                    });
                    setRentParty('');
                    setRentAmt('');
                    setRentDue('');
                  }}
                  className="space-y-2.5"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRentDir('in');
                        setRentImmediate(true);
                      }}
                      className={`rounded-xl border py-2 text-xs font-bold ${
                        rentDir === 'in'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                      }`}
                    >
                      📈 له (أجرة لي)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRentDir('out');
                        setRentImmediate(false);
                      }}
                      className={`rounded-xl border py-2 text-xs font-bold ${
                        rentDir === 'out'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                          : 'border-slate-200 text-slate-600 dark:border-slate-700'
                      }`}
                    >
                      📉 عليه (أجرة عليّ)
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['كراء سكن', 'كراء محل', 'كراء كراج'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setRentUnit(u)}
                        className={`rounded-xl border py-2 text-xs font-bold ${
                          rentUnit === u
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      value={rentParty}
                      onChange={(e) => setRentParty(e.target.value)}
                      placeholder={rentDir === 'in' ? 'اسم المستأجر' : 'اسم المؤجر / صاحب العقار'}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="number"
                      min={1}
                      value={rentAmt}
                      onChange={(e) => setRentAmt(e.target.value)}
                      placeholder="المبلغ (دج)"
                      className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <div>
                      <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">
                        تاريخ الاستحقاق (اختياري)
                      </label>
                      <input
                        type="date"
                        value={rentDue}
                        onChange={(e) => setRentDue(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={rentImmediate}
                      onChange={(e) => setRentImmediate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span>
                      {rentDir === 'in'
                        ? 'مقبوض الآن (إضافة فورية للخزينة)'
                        : 'تسديد فوري الآن من الخزينة'}
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    حفظ {rentUnit}
                  </button>
                </form>

                {/* Filter + List */}
                <div className="flex gap-1.5">
                  {(
                    [
                      ['all', 'الكل'],
                      ['in', 'له'],
                      ['out', 'عليه'],
                    ] as const
                  ).map(([k, lbl]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRentFilter(k)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        rentFilter === k
                          ? 'bg-emerald-700 text-white'
                          : 'border border-slate-200 text-slate-600 dark:border-slate-700'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRent.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">لا توجد سجلات كراء بعد.</p>
                  ) : (
                    filteredRent.map((r) => (
                      <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs">
                        <div>
                          <strong className="text-sm">
                            {r.unit} — {r.party}
                          </strong>
                          <div className="text-slate-500">
                            {r.direction === 'in' ? 'له' : 'عليه'} ·{' '}
                            {r.settled ? 'مُحصّل/مسدد' : 'قيد الانتظار'} · {r.date}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`tabular-nums text-sm font-bold ${blurCls}`}>
                            {fmt(r.amount)}
                          </span>
                          {!r.settled && (
                            <button
                              type="button"
                              onClick={() => onCollectRent(r.id)}
                              className="rounded-xl bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                            >
                              {r.direction === 'in' ? 'تحصيل' : 'تسديد'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteRent(r.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Add New Home / Store / Person Debt (له و عليه + النشاط تحت الاسم مباشرة) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              تسجيل دين (له / عليه) — المحلات والأشخاص
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(debtAmt);
                if (!creditor.trim() || !Number.isFinite(amt) || amt <= 0) return;
                onAddHomeDebt({
                  creditor: creditor.trim(),
                  item: item.trim() || debtActivity,
                  activity: debtActivity,
                  amount: amt,
                  due: debtDue,
                  direction: debtDir,
                  photo: debtPhoto || undefined,
                });
                setCreditor('');
                setItem('');
                setDebtAmt('');
                setDebtDue('');
                setDebtPhoto('');
              }}
              className="mt-3 space-y-2.5"
            >
              {/* له / عليه choices */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtDir('out')}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    debtDir === 'out'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700'
                  }`}
                >
                  📉 عليه (دين عليّ للمحل / الشخص)
                </button>
                <button
                  type="button"
                  onClick={() => setDebtDir('in')}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    debtDir === 'in'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700'
                  }`}
                >
                  📈 له (مستحق لي عند الشخص)
                </button>
              </div>

              {/* Name input */}
              <input
                type="text"
                required
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="اسم المستأجر / الشخص / المحل (مثال: دهليس أيوب، حسام بوذن...)"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />

              {/* Directly underneath: Activity / Category select box */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  نوع الدين / الفئة
                </label>
                <select
                  value={debtActivity}
                  onChange={(e) => setDebtActivity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  {DEBT_ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              {creditorChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {creditorChips.slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCreditor(c)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="تفاصيل إضافية (اختياري)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  required
                  value={debtAmt}
                  onChange={(e) => setDebtAmt(e.target.value)}
                  placeholder="المبلغ (دج)"
                  className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold text-slate-500">
                    تاريخ الاستحقاق (اختياري)
                  </label>
                  <input
                    type="date"
                    value={debtDue}
                    onChange={(e) => setDebtDue(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">
                  <Camera className="h-4 w-4" />
                  <span>{debtPhoto ? 'صورة مرفقة ✓' : 'صورة ورقة الكريدي'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setDebtPhoto(await compressImageFile(f));
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className={`mr-auto inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold text-white ${
                    debtDir === 'in'
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  {debtDir === 'in' ? 'إضافة مستحق (له)' : 'إضافة دين (عليه)'}
                </button>
              </div>
            </form>
          </section>

          {/* Grouped Creditors Directory with Search & Filters */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={debtSearch}
                  onChange={(e) => setDebtSearch(e.target.value)}
                  placeholder="بحث باسم الجهة أو الغرض..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
              >
                <Filter className="h-3.5 w-3.5" />
                تصفية
              </button>
            </div>

            <div className="mt-2.5 flex gap-1.5">
              {(
                [
                  ['all', 'الكل'],
                  ['out', 'عليه'],
                  ['in', 'له'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDebtDirFilter(k)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${
                    debtDirFilter === k
                      ? 'bg-emerald-700 text-white'
                      : 'border border-slate-200 text-slate-600 dark:border-slate-700'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {showFilters && (
              <div className="mt-2.5 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50 sm:grid-cols-3">
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">كل الأشهر</option>
                  {debtMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatYM(m)}
                    </option>
                  ))}
                </select>
                <select
                  value={filterActivity}
                  onChange={(e) => setFilterActivity(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="all">كل الأنشطة</option>
                  {DEBT_ACTIVITIES.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'balance' | 'name' | 'due')}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="balance">الأعلى رصيداً</option>
                  <option value="name">حسب الاسم</option>
                  <option value="due">الأقرب للاستحقاق</option>
                </select>
              </div>
            )}

            <div className="mt-3 space-y-3">
              {groupedCreditors.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">لا توجد ديون مسجلة.</p>
              ) : (
                groupedCreditors.map((group) => {
                  const isOpen = expandedCreditors[group.groupKey] ?? true;
                  const isIn = group.direction === 'in';
                  return (
                    <div
                      key={group.groupKey}
                      className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedCreditors((prev) => ({
                              ...prev,
                              [group.groupKey]: !isOpen,
                            }))
                          }
                          className="text-right"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <strong className="text-sm font-bold">{group.creditor}</strong>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                isIn
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}
                            >
                              {isIn ? 'له' : 'عليه'}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {group.activity}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({group.items.length})
                            </span>
                          </div>
                          <div className={`tabular-nums mt-0.5 text-xs ${blurCls}`}>
                            الأصلي: {fmt(group.total)} · {isIn ? 'المحصّل' : 'المدفوع'}: {fmt(group.paid)} ·{' '}
                            <strong
                              className={
                                group.remaining > 0
                                  ? isIn
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-600'
                                  : 'text-emerald-600'
                              }
                            >
                              {group.remaining > 0 ? `المتبقي ${fmt(group.remaining)}` : 'خالص بالكامل'}
                            </strong>
                          </div>
                        </button>

                        {group.remaining > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onPayCreditorAll(group.creditor, group.remaining, group.direction)
                            }
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            {isIn ? 'تحصيل دفعة' : 'تسديد دفعة'}
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        <div className="mt-2.5 divide-y divide-slate-100 border-t border-slate-100 pt-2 dark:divide-slate-800 dark:border-slate-800">
                          {group.items.map((d) => {
                            const rem = debtRemaining(d);
                            const du = daysUntil(d.due);
                            return (
                              <div
                                key={d.id}
                                className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold">
                                    {d.item}{' '}
                                    <span className="text-slate-400">
                                      · {d.activity} · {d.date}
                                    </span>
                                  </div>
                                  <div className={`tabular-nums text-slate-500 ${blurCls}`}>
                                    {fmt(d.amount)} ({isIn ? 'محصّل' : 'مدفوع'} {fmt(d.paid)}) ·{' '}
                                    <strong className={rem > 0 ? (isIn ? 'text-emerald-700' : 'text-rose-600') : 'text-emerald-600'}>
                                      {rem > 0 ? `متبقي ${fmt(rem)}` : 'خالص ✓'}
                                    </strong>
                                    {du !== null && rem > 0 && (
                                      <span className="mr-1.5 text-amber-600">
                                        ({du < 0 ? `متأخر ${Math.abs(du)}ي` : `بعد ${du}ي`})
                                      </span>
                                    )}
                                  </div>
                                  {d.photo && (
                                    <button
                                      type="button"
                                      onClick={() => onPreviewPhoto(d.photo!, `${d.creditor} — ${d.item}`)}
                                      className="mt-1 text-[11px] font-semibold text-emerald-700 underline"
                                    >
                                      عرض ورقة الكريدي
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {rem > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => onPayHomeDebt(d)}
                                      className="rounded-lg border border-emerald-600 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"
                                    >
                                      {isIn ? 'تحصيل البند' : 'تسديد البند'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onDeleteHomeDebt(d.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 2: BILLS & OBLIGATIONS ================= */}
      {tab === 'bills' && (
        <div className="space-y-4">
          {/* Monthly Recurring Obligations */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">📌 الالتزامات الشهرية الثابتة</h2>
              <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {unpaidOblCount} منتظرة هذا الشهر
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(oblAmt);
                if (!oblName.trim() || !Number.isFinite(amt) || amt <= 0) return;
                onAddObligation({
                  name: oblName.trim(),
                  amount: amt,
                  dueDay: Math.min(28, Math.max(1, Number(oblDay) || 15)),
                  creditor: oblCreditor.trim() || undefined,
                  photo: oblPhoto || undefined,
                });
                setOblName('');
                setOblAmt('');
                setOblCreditor('');
                setOblPhoto('');
              }}
              className="mt-3 space-y-2"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                <input
                  type="text"
                  value={oblName}
                  onChange={(e) => setOblName(e.target.value)}
                  placeholder="اسم الالتزام (كراء، أنترنت...)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  value={oblAmt}
                  onChange={(e) => setOblAmt(e.target.value)}
                  placeholder="المبلغ الشهري (دج)"
                  className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={oblCreditor}
                  onChange={(e) => setOblCreditor(e.target.value)}
                  placeholder="الجهة / الشخص (اختياري)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={oblDay}
                  onChange={(e) => setOblDay(e.target.value)}
                  placeholder="يوم الاستحقاق"
                  className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">
                  <Camera className="h-4 w-4" />
                  <span>{oblPhoto ? 'صورة الوصل مرفقة ✓' : 'صورة العقد / الوصل'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setOblPhoto(await compressImageFile(f));
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className="mr-auto rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  ➕ إضافة التزام شهري
                </button>
              </div>
            </form>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {db.obligations.length === 0 ? (
                <p className="py-5 text-center text-xs text-slate-500">
                  أضف فواتيرك الثابتة لمتابعة دفعها بضغطة واحدة كل شهر.
                </p>
              ) : (
                db.obligations.map((o) => {
                  const paidThisMonth = o.paidMonths?.includes(ym);
                  return (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                      <div>
                        <div className="text-sm font-bold">{o.name}</div>
                        <div className={`tabular-nums text-xs text-slate-500 ${blurCls}`}>
                          {fmt(o.amount)} · يوم {o.dueDay} من كل شهر
                          {o.creditor ? ` · ${o.creditor}` : ''}
                        </div>
                        {o.photo && (
                          <button
                            type="button"
                            onClick={() => onPreviewPhoto(o.photo!, o.name)}
                            className="text-[11px] font-semibold text-emerald-700 underline"
                          >
                            عرض صورة الوصل
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleObligationPaid(o.id)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                            paidThisMonth
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-600 text-white hover:bg-amber-700'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{paidThisMonth ? 'مدفوعة هذا الشهر' : 'تسديد الآن'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteObligation(o.id)}
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

          {/* Bill Debt / Quick Bill Entry (V12 card-bill-entry + bill-reminder-center) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Receipt className="h-4 w-4 text-sky-600" />
              <span>تسجيل فاتورة (كهرباء، غاز، ماء، أنترنت، كراء)</span>
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(billAmt);
                const finalName =
                  billType === 'custom' ? billCustomName.trim() : billType;
                if (!finalName || !Number.isFinite(amt) || amt <= 0) return;
                onAddBillEntry({
                  name: finalName,
                  amount: amt,
                  creditor: billCreditor.trim() || finalName,
                  status: billStatus,
                  due: billDue,
                  unpaidMonths: Math.max(1, Number(billUnpaidMonths) || 1),
                  recurring: billRecurring,
                  photo: billPhoto || undefined,
                });
                setBillAmt('');
                setBillCustomName('');
                setBillCreditor('');
                setBillDue('');
                setBillPhoto('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={billType}
                  onChange={(e) => setBillType(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  {BILL_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p === 'custom' ? '✏️ فاتورة مخصصة (اكتب الاسم)' : p}
                    </option>
                  ))}
                </select>
                {billType === 'custom' && (
                  <input
                    type="text"
                    required
                    value={billCustomName}
                    onChange={(e) => setBillCustomName(e.target.value)}
                    placeholder="اسم الفاتورة المخصصة"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                )}
                <input
                  type="number"
                  min={1}
                  required
                  value={billAmt}
                  onChange={(e) => setBillAmt(e.target.value)}
                  placeholder="مبلغ الشهر الواحد (دج)"
                  className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={billCreditor}
                  onChange={(e) => setBillCreditor(e.target.value)}
                  placeholder="الشخص أو الجهة (اختياري)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <select
                  value={billStatus}
                  onChange={(e) => setBillStatus(e.target.value as 'pending' | 'paid')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="pending">دين غير مسدّد (يضاف للديون)</option>
                  <option value="paid">مدفوعة الآن (تخصم من الخزينة)</option>
                </select>
                <input
                  type="date"
                  value={billDue}
                  onChange={(e) => setBillDue(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                {billStatus === 'pending' && (
                  <select
                    value={billUnpaidMonths}
                    onChange={(e) => setBillUnpaidMonths(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="1">شهر واحد (1)</option>
                    <option value="2">شهرين غير مسددين (2)</option>
                    <option value="3">3 أشهر غير مسددة</option>
                    <option value="4">4 أشهر غير مسددة</option>
                    <option value="6">6 أشهر غير مسددة</option>
                  </select>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={billRecurring}
                  onChange={(e) => setBillRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                />
                <span>تكرار شهري تلقائي (إضافتها أيضاً كالتزام شهري ثابت)</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">
                  <Camera className="h-4 w-4" />
                  <span>{billPhoto ? 'صورة مرفقة ✓' : 'صورة الفاتورة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (f) setBillPhoto(await compressImageFile(f));
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className="mr-auto rounded-xl bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800"
                >
                  {billStatus === 'pending' ? 'تسجيل الفاتورة كدين' : 'تسجيل ودفع الفاتورة'}
                </button>
              </div>
            </form>

            {billDebts.length > 0 && (
              <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-3 dark:divide-slate-800 dark:border-slate-800">
                <div className="pb-2 text-xs font-bold text-slate-500">ديون الفواتير المسجلة</div>
                {billDebts.map((b) => {
                  const rem = debtRemaining(b);
                  return (
                    <div key={b.id} className="flex items-center justify-between py-2 text-xs">
                      <div>
                        <strong>
                          {b.creditor} — {b.item}
                        </strong>
                        <div className={`text-slate-500 ${blurCls}`}>
                          المتبقي: {fmt(rem)} {b.due ? `· استحقاق ${b.due}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rem > 0 && (
                          <button
                            type="button"
                            onClick={() => onPayHomeDebt(b)}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white"
                          >
                            تسديد
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteHomeDebt(b.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= TAB 3: SALARY DEDUCTIONS & FAC PLANS ================= */}
      {tab === 'deductions' && (
        <div className="space-y-4">
          {/* Direct Salary Deductions: Facility & Services */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">
                💳 اقتطاعات الراتب الشهري (فاسيليتي وخدمات)
              </h2>
              <span className="rounded-lg bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                يُخصم من الراتب
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const facA = Math.max(0, Number(facDedAmt) || 0);
                const srvA = Math.max(0, Number(srvDedAmt) || 0);
                if (facA <= 0 && srvA <= 0) return;
                onAddSalaryDeduction({
                  facAmount: facA,
                  facNote: facDedNote.trim(),
                  srvAmount: srvA,
                  srvNote: srvDedNote.trim(),
                  srvMonth: srvDedMonth || ym,
                });
                setFacDedAmt('');
                setFacDedNote('');
                setSrvDedAmt('');
                setSrvDedNote('');
              }}
              className="mt-3 space-y-3"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    🏷️ اقتطاع فاسيليتي (دج)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={facDedAmt}
                    onChange={(e) => setFacDedAmt(e.target.value)}
                    placeholder="المبلغ (مثلاً: 10000)"
                    className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    value={facDedNote}
                    onChange={(e) => setFacDedNote(e.target.value)}
                    placeholder="تفاصيل (ثلاجة، هاتف...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                    🏢 اقتطاع خدمات / سلفة (دج)
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={srvDedAmt}
                    onChange={(e) => setSrvDedAmt(e.target.value)}
                    placeholder="المبلغ (مثلاً: 5000)"
                    className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={srvDedNote}
                      onChange={(e) => setSrvDedNote(e.target.value)}
                      placeholder="نوع الخدمة / سلفة"
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="month"
                      value={srvDedMonth}
                      onChange={(e) => setSrvDedMonth(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
              >
                خصم الاقتطاع من الراتب الشهري
              </button>
            </form>

            {monthlyDeductions.length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-2 dark:divide-slate-800 dark:border-slate-800">
                {monthlyDeductions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <strong>{t.name}</strong>
                      <div className="text-slate-500">{t.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`tabular-nums font-bold text-rose-600 ${blurCls}`}>
                        {fmt(t.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteTransaction(t.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Installment Plans Tracker */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              📆 متابعة خطط الأقساط (فاسيليتي)
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const mAmt = Number(facMonthly);
                const mCnt = Number(facMonths);
                if (!facName.trim() || !Number.isFinite(mAmt) || mAmt <= 0 || mCnt <= 0) return;
                onAddFacPlan(facName.trim(), mAmt, mCnt);
                setFacName('');
                setFacMonthly('');
              }}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
            >
              <input
                type="text"
                value={facName}
                onChange={(e) => setFacName(e.target.value)}
                placeholder="المنتج / الخطة (ثلاجة، غسالة...)"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                value={facMonthly}
                onChange={(e) => setFacMonthly(e.target.value)}
                placeholder="القسط الشهري (دج)"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                max={60}
                value={facMonths}
                onChange={(e) => setFacMonths(e.target.value)}
                placeholder="عدد الأشهر الكلي"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
              >
                إضافة خطة قسط
              </button>
            </form>

            <div className="mt-4 space-y-2.5">
              {db.facPlans.length === 0 ? (
                <p className="py-5 text-center text-xs text-slate-500">لا توجد خطط أقساط نشطة.</p>
              ) : (
                db.facPlans.map((p) => {
                  const remMonths = Math.max(0, p.months - p.paidMonths);
                  const pct = Math.min(100, Math.round((p.paidMonths / Math.max(1, p.months)) * 100));
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold">{p.name}</div>
                          <div className={`tabular-nums text-xs text-slate-500 ${blurCls}`}>
                            {fmt(p.monthly)}/شهر · المدفوع {p.paidMonths} من {p.months} شهر · المتبقي{' '}
                            {fmt(remMonths * p.monthly)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {remMonths > 0 && (
                            <button
                              type="button"
                              onClick={() => onPayFacMonth(p.id)}
                              className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                            >
                              خصم قسط شهر
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteFacPlan(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-emerald-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
