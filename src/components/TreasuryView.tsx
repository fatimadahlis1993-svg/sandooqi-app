import React, { useState } from 'react';
import { ArrowLeftRight, CalendarCheck, PlusCircle } from 'lucide-react';
import { AccountId, SandooqiDB, Transaction } from '../types/sandooqi';
import { computeCashReportForMonth, currentYM, fmt, formatYM } from '../utils/finance';

interface TreasuryViewProps {
  db: SandooqiDB;
  onSaveSalaries: (s1: number, s2: number) => void;
  onAddMovement: (payload: {
    accountId: AccountId;
    type: 'in' | 'out';
    name: string;
    amount: number;
  }) => void;
  onTransfer: (from: AccountId, to: AccountId, amount: number, note: string) => void;
  onOpenMonthClose: () => void;
}

const ACCOUNT_LABELS: Record<AccountId, string> = {
  family: 'الحساب العائلي',
  personal: 'الحساب الشخصي',
  sewing: 'حساب الخياطة',
};

export const TreasuryView: React.FC<TreasuryViewProps> = ({
  db,
  onSaveSalaries,
  onAddMovement,
  onTransfer,
  onOpenMonthClose,
}) => {
  const ym = currentYM();
  const report = computeCashReportForMonth(db, ym);
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  const [s1, setS1] = useState(String(report.salary.s1));
  const [s2, setS2] = useState(String(report.salary.s2));

  const [movAccount, setMovAccount] = useState<AccountId>('family');
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movName, setMovName] = useState('');
  const [movAmount, setMovAmount] = useState('');

  const [fromAcc, setFromAcc] = useState<AccountId>('sewing');
  const [toAcc, setToAcc] = useState<AccountId>('family');
  const [trAmount, setTrAmount] = useState('');
  const [trNote, setTrNote] = useState('');

  const [historyFilter, setHistoryFilter] = useState<'all' | AccountId>('all');

  const recentMovements: Transaction[] = db.tx
    .filter((t) => historyFilter === 'all' || t.accountId === historyFilter)
    .slice(0, 25);

  return (
    <div className="space-y-4">
      {/* Three Accounts Overview */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ['family', report.home.balance, report.home.income, report.home.out],
            ['personal', report.personal.balance, report.personal.income, report.personal.out],
            ['sewing', report.sewing.balance, report.sewing.income, report.sewing.out],
          ] as const
        ).map(([accId, bal, inc, out]) => (
          <div
            key={accId}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {ACCOUNT_LABELS[accId]}
            </div>
            <div className={`tabular-nums mt-1.5 text-2xl font-bold text-slate-900 dark:text-slate-50 ${blurCls}`}>
              {fmt(bal)}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
              <span className="text-emerald-700 dark:text-emerald-400">
                دخل: <span className={`tabular-nums font-bold ${blurCls}`}>{fmt(inc)}</span>
              </span>
              <span className="text-rose-600 dark:text-rose-400">
                خروج: <span className={`tabular-nums font-bold ${blurCls}`}>{fmt(out)}</span>
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* Salaries & Month Close */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              رواتب {formatYM(ym)} وإغلاق الشهر
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              الرصيد المرحّل للشهر الحالي: <strong className={`tabular-nums ${blurCls}`}>{fmt(report.home.opening)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenMonthClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            <span>إغلاق الشهر وترحيل الفائض</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveSalaries(Math.max(0, Number(s1) || 0), Math.max(0, Number(s2) || 0));
          }}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              الراتب الأول (دج)
            </label>
            <input
              type="number"
              min={0}
              value={s1}
              onChange={(e) => setS1(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              الراتب الثاني (دج)
            </label>
            <input
              type="number"
              min={0}
              value={s2}
              onChange={(e) => setS2(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              حفظ الرواتب
            </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Record Income / Expense */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <span>تسجيل دخل إضافي أو سحب مباشر</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amt = Number(movAmount);
              if (!movName.trim() || !Number.isFinite(amt) || amt <= 0) return;
              onAddMovement({
                accountId: movAccount,
                type: movType,
                name: movName.trim(),
                amount: amt,
              });
              setMovName('');
              setMovAmount('');
            }}
            className="mt-3 space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                value={movAccount}
                onChange={(e) => setMovAccount(e.target.value as AccountId)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="family">الحساب العائلي</option>
                <option value="personal">الحساب الشخصي</option>
                <option value="sewing">حساب الخياطة</option>
              </select>
              <select
                value={movType}
                onChange={(e) => setMovType(e.target.value as 'in' | 'out')}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="in">إيداع / دخل (+)</option>
                <option value="out">سحب / مصروف (−)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="البيان (مثلاً: منحة، أرباح...)"
                value={movName}
                onChange={(e) => setMovName(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                placeholder="المبلغ (دج)"
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
            >
              تنفيذ الحركة
            </button>
          </form>
        </section>

        {/* Internal Account Transfer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <ArrowLeftRight className="h-4 w-4 text-sky-600" />
            <span>تحويل بين الحسابات</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amt = Number(trAmount);
              if (fromAcc === toAcc || !Number.isFinite(amt) || amt <= 0) return;
              onTransfer(fromAcc, toAcc, amt, trNote.trim());
              setTrAmount('');
              setTrNote('');
            }}
            className="mt-3 space-y-3"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">من</label>
                <select
                  value={fromAcc}
                  onChange={(e) => setFromAcc(e.target.value as AccountId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="family">الحساب العائلي</option>
                  <option value="personal">الحساب الشخصي</option>
                  <option value="sewing">حساب الخياطة</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-500">إلى</label>
                <select
                  value={toAcc}
                  onChange={(e) => setToAcc(e.target.value as AccountId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="family">الحساب العائلي</option>
                  <option value="personal">الحساب الشخصي</option>
                  <option value="sewing">حساب الخياطة</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={1}
                placeholder="المبلغ (دج)"
                value={trAmount}
                onChange={(e) => setTrAmount(e.target.value)}
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="ملاحظة التحويل"
                value={trNote}
                onChange={(e) => setTrNote(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              disabled={fromAcc === toAcc}
              className="w-full rounded-xl bg-sky-700 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-45"
            >
              تحويل المبلغ
            </button>
          </form>
        </section>
      </div>

      {/* Movements History */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            سجل حركات الخزينة
          </h2>
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(
              [
                ['all', 'الكل'],
                ['family', 'العائلي'],
                ['personal', 'الشخصي'],
                ['sewing', 'الخياطة'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setHistoryFilter(k)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  historyFilter === k
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {recentMovements.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">لا توجد حركات مسجلة بعد.</p>
          ) : (
            recentMovements.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                    {t.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {ACCOUNT_LABELS[t.accountId]} · {t.date}
                    {t.person ? ` · ${t.person}` : ''}
                  </div>
                </div>
                <span
                  className={`tabular-nums shrink-0 font-bold ${
                    t.type === 'in'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  } ${blurCls}`}
                >
                  {t.type === 'in' ? '+' : '−'}
                  {fmt(t.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
