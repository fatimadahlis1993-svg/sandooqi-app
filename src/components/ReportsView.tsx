import React, { useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { SandooqiDB } from '../types/sandooqi';
import { computeCashReportForMonth, currentYM, fmt, formatYM, getTxYM } from '../utils/finance';

interface ReportsViewProps {
  db: SandooqiDB;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ db }) => {
  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentYM()]);
    db.tx.forEach((t) => set.add(getTxYM(t)));
    Object.keys(db.monthArchive).forEach((m) => set.add(m));
    return Array.from(set).sort().reverse();
  }, [db.tx, db.monthArchive]);

  const [selectedMonth, setSelectedMonth] = useState(currentYM());
  const report = useMemo(() => computeCashReportForMonth(db, selectedMonth), [db, selectedMonth]);
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  const breakdown = useMemo(() => {
    const map: Record<string, number> = {
      'مشتريات منزلية': 0,
      'فواتير وديون': 0,
      'ادخار وأهداف': 0,
      'خياطة وشخصي': 0,
    };
    for (const t of report.arr) {
      if (t.type !== 'out' || t.cat === 'transfer' || t.cat === 'account_transfer') continue;
      if (t.cat === 'sav') map['ادخار وأهداف'] += t.amount;
      else if (t.cat === 'debt_payment' || t.cat === 'bill') map['فواتير وديون'] += t.amount;
      else if (t.accountId === 'personal' || t.accountId === 'sewing') map['خياطة وشخصي'] += t.amount;
      else map['مشتريات منزلية'] += t.amount;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([label, val]) => ({
      label,
      val,
      pct: Math.round((val / total) * 100),
    }));
  }, [report.arr]);

  return (
    <div className="space-y-4">
      <section className="print-only-sheet rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              التقرير المالي الشهري — {formatYM(selectedMonth)}
            </h2>
            <p className="text-xs text-slate-500">ملخص الدخل والمصاريف والأرصدة عبر كل الحسابات</p>
          </div>
          <div className="no-print flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatYM(m)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Printer className="h-3.5 w-3.5" />
              طباعة التقرير
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">إجمالي الدخل</div>
            <div className={`tabular-nums mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
              {fmt(report.combined.income)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">إجمالي المصاريف</div>
            <div className={`tabular-nums mt-1 text-base font-bold text-rose-600 dark:text-rose-400 ${blurCls}`}>
              {fmt(report.combined.out)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">صافي الشهر</div>
            <div
              className={`tabular-nums mt-1 text-base font-bold ${
                report.combined.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
              } ${blurCls}`}
            >
              {fmt(report.combined.net)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="text-xs text-slate-500">الرصيد التراكمي الكلي</div>
            <div className={`tabular-nums mt-1 text-base font-bold ${blurCls}`}>
              {fmt(report.combined.balance)}
            </div>
          </div>
        </div>

        {/* Category Breakdown Bars */}
        <div className="mt-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300">
            توزيع المصاريف حسب الفئة
          </h3>
          {breakdown.map((b) => (
            <div key={b.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-semibold">{b.label}</span>
                <span className={`tabular-nums font-bold ${blurCls}`}>
                  {fmt(b.val)} ({b.pct}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="h-full bg-emerald-600" style={{ width: `${b.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closed Months Archive */}
      {Object.keys(db.monthArchive).length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            أرشيف الأشهر المغلقة
          </h3>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {Object.values(db.monthArchive)
              .sort((a, b) => b.ym.localeCompare(a.ym))
              .map((arch) => (
                <div key={arch.ym} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs">
                  <div>
                    <strong className="text-sm">{formatYM(arch.ym)}</strong>
                    <div className="text-slate-500">
                      مُرحّل إلى {formatYM(arch.targetMonth)} · ادخار {fmt(arch.savedToGoal)}
                    </div>
                  </div>
                  <div className={`tabular-nums font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                    الفائض المرحّل: {fmt(arch.carriedForward)}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
};
