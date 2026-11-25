import React, { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Plus, Trash2 } from 'lucide-react';
import { HomeDebt, SandooqiDB } from '../types/sandooqi';
import { currentYM, daysUntil, debtRemaining, fmt } from '../utils/finance';

interface BillsDebtsViewProps {
  db: SandooqiDB;
  onAddHomeDebt: (payload: { creditor: string; item: string; amount: number; due: string }) => void;
  onPayHomeDebt: (debt: HomeDebt) => void;
  onDeleteHomeDebt: (id: number) => void;
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
  onAddObligation: (name: string, amount: number, dueDay: number) => void;
  onToggleObligationPaid: (id: number) => void;
  onDeleteObligation: (id: number) => void;
  onAddFacPlan: (name: string, monthly: number, months: number) => void;
  onPayFacMonth: (id: number) => void;
  onDeleteFacPlan: (id: number) => void;
}

export const BillsDebtsView: React.FC<BillsDebtsViewProps> = ({
  db,
  onAddHomeDebt,
  onPayHomeDebt,
  onDeleteHomeDebt,
  onAddRentRecord,
  onCollectRent,
  onDeleteRent,
  onAddObligation,
  onToggleObligationPaid,
  onDeleteObligation,
  onAddFacPlan,
  onPayFacMonth,
  onDeleteFacPlan,
}) => {
  const [tab, setTab] = useState<'debts' | 'rent' | 'bills' | 'fac'>('debts');

  // Debt form
  const [creditor, setCreditor] = useState('');
  const [item, setItem] = useState('');
  const [debtAmt, setDebtAmt] = useState('');
  const [debtDue, setDebtDue] = useState('');
  const [debtSearch, setDebtSearch] = useState('');

  // Rent form
  const [rentDir, setRentDir] = useState<'in' | 'out'>('in');
  const [rentUnit, setRentUnit] = useState('كراء سكن');
  const [rentParty, setRentParty] = useState('');
  const [rentAmt, setRentAmt] = useState('');
  const [rentDue, setRentDue] = useState('');
  const [rentImmediate, setRentImmediate] = useState(true);

  // Bill form
  const [billName, setBillName] = useState('');
  const [billAmt, setBillAmt] = useState('');
  const [billDay, setBillDay] = useState('15');

  // Fac plan form
  const [facName, setFacName] = useState('');
  const [facMonthly, setFacMonthly] = useState('');
  const [facMonths, setFacMonths] = useState('12');

  const ym = currentYM();
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  const filteredDebts = useMemo(() => {
    const q = debtSearch.trim().toLowerCase();
    return db.homeDebts.filter((d) => {
      if (!q) return true;
      return d.creditor.toLowerCase().includes(q) || d.item.toLowerCase().includes(q);
    });
  }, [db.homeDebts, debtSearch]);

  const totalOpenDebt = db.homeDebts.reduce((s, d) => s + debtRemaining(d), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
        {(
          [
            ['debts', `ديون المحلات (${db.homeDebts.filter((d) => debtRemaining(d) > 0).length})`],
            ['rent', `كراء له وعليه (${db.rentDebts.length})`],
            ['bills', `الفواتير (${db.obligations.length})`],
            ['fac', `الاقتطاعات (${db.facPlans.length})`],
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

      {/* TAB 1: HOME DEBTS */}
      {tab === 'debts' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                تسجيل دين جديد بالاسم
              </h2>
              <span className={`tabular-nums text-xs font-bold text-rose-600 dark:text-rose-400 ${blurCls}`}>
                إجمالي الديون المفتوحة: {fmt(totalOpenDebt)}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(debtAmt);
                if (!creditor.trim() || !Number.isFinite(amt) || amt <= 0) return;
                onAddHomeDebt({
                  creditor: creditor.trim(),
                  item: item.trim() || 'مشتريات بالدين',
                  amount: amt,
                  due: debtDue,
                });
                setCreditor('');
                setItem('');
                setDebtAmt('');
                setDebtDue('');
              }}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5"
            >
              <input
                type="text"
                value={creditor}
                onChange={(e) => setCreditor(e.target.value)}
                placeholder="اسم المحل / الشخص"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="البيان / الغرض"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                value={debtAmt}
                onChange={(e) => setDebtAmt(e.target.value)}
                placeholder="المبلغ (دج)"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="date"
                value={debtDue}
                onChange={(e) => setDebtDue(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
              >
                <Plus className="h-4 w-4" />
                إضافة دين
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <input
              type="text"
              value={debtSearch}
              onChange={(e) => setDebtSearch(e.target.value)}
              placeholder="تصفية الديون باسم المحل أو الغرض..."
              className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="space-y-2.5">
              {filteredDebts.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">لا توجد ديون مسجلة.</p>
              ) : (
                filteredDebts.map((d) => {
                  const rem = debtRemaining(d);
                  const du = daysUntil(d.due);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {d.creditor} — <span className="font-medium">{d.item}</span>
                        </div>
                        <div className="tabular-nums mt-0.5 text-xs text-slate-500">
                          الأصلي: {fmt(d.amount)} · المدفوع: {fmt(d.paid)} ·{' '}
                          <strong className={rem > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                            {rem > 0 ? `المتبقي ${fmt(rem)}` : 'مسدّد بالكامل'}
                          </strong>
                          {du !== null && rem > 0 && (
                            <span className="mr-2 text-amber-700 dark:text-amber-400">
                              ({du < 0 ? `متأخر ${Math.abs(du)} يوم` : `بعد ${du} يوم`})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rem > 0 && (
                          <button
                            type="button"
                            onClick={() => onPayHomeDebt(d)}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            تسديد
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteHomeDebt(d.id)}
                          aria-label="حذف"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
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

      {/* TAB 2: RENT LAH / ALAYH */}
      {tab === 'rent' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            سجل الكراء والمستحقات (له وعليه)
          </h2>

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
            className="mt-3 space-y-3"
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
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700'
                }`}
              >
                له (مبلغ مستحق لك)
              </button>
              <button
                type="button"
                onClick={() => {
                  setRentDir('out');
                  setRentImmediate(false);
                }}
                className={`rounded-xl border py-2 text-xs font-bold ${
                  rentDir === 'out'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 dark:border-rose-500 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700'
                }`}
              >
                عليه (إيجار عليك)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              <select
                value={rentUnit}
                onChange={(e) => setRentUnit(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="كراء سكن">كراء سكن</option>
                <option value="كراء محل">كراء محل</option>
                <option value="مستحق شخصي">مستحق شخصي</option>
              </select>
              <input
                type="text"
                value={rentParty}
                onChange={(e) => setRentParty(e.target.value)}
                placeholder={rentDir === 'in' ? 'اسم المستأجر' : 'اسم المؤجر'}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                value={rentAmt}
                onChange={(e) => setRentAmt(e.target.value)}
                placeholder="المبلغ (دج)"
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="date"
                value={rentDue}
                onChange={(e) => setRentDue(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
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
              className="w-full rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              تسجيل الحركة
            </button>
          </form>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {db.rentDebts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">لا توجد سجلات كراء بعد.</p>
            ) : (
              db.rentDebts.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-bold">
                      {r.unit} — {r.party}
                    </div>
                    <div className="text-xs text-slate-500">
                      {r.direction === 'in' ? 'له' : 'عليه'} ·{' '}
                      {r.settled ? 'مُحصّل/مسدد' : 'قيد الانتظار'} · {r.date}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm font-bold">{fmt(r.amount)}</span>
                    {r.direction === 'in' && !r.settled && (
                      <button
                        type="button"
                        onClick={() => onCollectRent(r.id)}
                        className="rounded-xl bg-emerald-700 px-3 py-1 text-xs font-bold text-white"
                      >
                        تحصيل للخزينة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteRent(r.id)}
                      aria-label="حذف"
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* TAB 3: MONTHLY BILLS / OBLIGATIONS */}
      {tab === 'bills' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            الفواتير والالتزامات الشهرية المتكررة
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amt = Number(billAmt);
              if (!billName.trim() || !Number.isFinite(amt) || amt <= 0) return;
              onAddObligation(billName.trim(), amt, Math.min(28, Math.max(1, Number(billDay) || 15)));
              setBillName('');
              setBillAmt('');
            }}
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4"
          >
            <input
              type="text"
              value={billName}
              onChange={(e) => setBillName(e.target.value)}
              placeholder="اسم الفاتورة (كهرباء، ماء، أنترنت...)"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={1}
              value={billAmt}
              onChange={(e) => setBillAmt(e.target.value)}
              placeholder="المبلغ (دج)"
              className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={1}
              max={28}
              value={billDay}
              onChange={(e) => setBillDay(e.target.value)}
              placeholder="يوم الاستحقاق"
              className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              إضافة التزام
            </button>
          </form>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {db.obligations.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                أضف فواتيرك الشهرية لتتبع دفعها بضغطة واحدة كل شهر.
              </p>
            ) : (
              db.obligations.map((o) => {
                const paidThisMonth = o.paidMonths?.includes(ym);
                return (
                  <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <div>
                      <div className="text-sm font-bold">{o.name}</div>
                      <div className="tabular-nums text-xs text-slate-500">
                        {fmt(o.amount)} · يوم {o.dueDay} من كل شهر
                      </div>
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
                        aria-label="حذف"
                        className="rounded p-1 text-slate-400 hover:text-rose-600"
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
      )}

      {/* TAB 4: INSTALLMENT PLANS (FACILITY) */}
      {tab === 'fac' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            الأقساط والاقتطاعات الشهرية (فاسيليتي)
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
              placeholder="المنتج / الخطة (مثلاً: ثلاجة)"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={1}
              value={facMonthly}
              onChange={(e) => setFacMonthly(e.target.value)}
              placeholder="القسط الشهري (دج)"
              className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={1}
              max={60}
              value={facMonths}
              onChange={(e) => setFacMonths(e.target.value)}
              placeholder="عدد الأشهر"
              className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
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
              <p className="py-6 text-center text-xs text-slate-500">لا توجد خطط أقساط نشطة.</p>
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
                        <div className="tabular-nums text-xs text-slate-500">
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
                          aria-label="حذف"
                          className="rounded p-1 text-slate-400 hover:text-rose-600"
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
      )}
    </div>
  );
};
