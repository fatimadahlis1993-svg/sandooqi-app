import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Brain,
  Copy,
  Download,
  Printer,
  Search,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { AccountId, SandooqiDB } from '../types/sandooqi';
import {
  computeCashReportForMonth,
  currentYM,
  debtRemaining,
  fmt,
  formatYM,
  getTxYM,
  shiftYM,
  transactionAccount,
} from '../utils/finance';

interface ReportsViewProps {
  db: SandooqiDB;
  onDeleteTransaction: (id: number) => void;
  onOpenMonthClose: () => void;
  onNotify: (msg: string) => void;
}

const ACC_LABELS: Record<AccountId, string> = {
  family: 'الحساب العائلي',
  personal: 'الحساب الشخصي',
  sewing: 'صندوق الخياطة',
};

export const ReportsView: React.FC<ReportsViewProps> = ({
  db,
  onDeleteTransaction,
  onOpenMonthClose,
  onNotify,
}) => {
  const availableMonths = useMemo(() => {
    const set = new Set<string>([currentYM()]);
    db.tx.forEach((t) => set.add(getTxYM(t)));
    Object.keys(db.monthArchive).forEach((m) => set.add(m));
    return Array.from(set).sort().reverse();
  }, [db.tx, db.monthArchive]);

  const [selectedMonth, setSelectedMonth] = useState(currentYM());
  const [logSearch, setLogSearch] = useState('');
  const [logAccount, setLogAccount] = useState<'all' | AccountId>('all');
  const [logType, setLogType] = useState<'all' | 'in' | 'out' | 'transfer'>('all');
  const [logCat, setLogCat] = useState<string>('all');

  const report = useMemo(() => computeCashReportForMonth(db, selectedMonth), [db, selectedMonth]);
  const prevReport = useMemo(
    () => computeCashReportForMonth(db, shiftYM(selectedMonth, -1)),
    [db, selectedMonth]
  );
  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  // Income, Deductions, Expenses exact V12 breakdown for home box
  const detailed = useMemo(() => {
    let fac = 0;
    let srv = 0;
    let sav = 0;
    let shop = 0;
    let bills = 0;
    let fam = 0;
    let debtsPaid = 0;
    for (const t of report.arr) {
      if (t.type !== 'out' || t.cat === 'transfer' || t.cat === 'account_transfer') continue;
      if (t.source === 'credit-purchase' || t.cat === 'credit_purchase') continue;
      const acc = transactionAccount(t);
      if (acc !== 'family') continue;
      if (t.cat === 'fac') fac += t.amount;
      else if (t.cat === 'srv') srv += t.amount;
      else if (t.cat === 'sav') sav += t.amount;
      else if (t.cat === 'bill') bills += t.amount;
      else if (t.cat === 'fam') fam += t.amount;
      else if (t.cat === 'debt_payment') debtsPaid += t.amount;
      else shop += t.amount;
    }
    const dedSum = fac + srv + sav;
    const expSum = shop + bills + fam + debtsPaid;
    return { fac, srv, sav, dedSum, shop, bills, fam, debtsPaid, expSum };
  }, [report.arr]);

  const breakdown = useMemo(() => {
    const map: Record<string, number> = {
      'مشتريات منزلية': detailed.shop,
      'فواتير وديون': detailed.bills + detailed.debtsPaid,
      'مصاريف العائلة': detailed.fam,
      'فاسيليتي وخدمات': detailed.fac + detailed.srv,
      'ادخار وأهداف': detailed.sav,
      'خياطة وشخصي': report.sewing.out + report.personal.out,
    };
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map).map(([label, val]) => ({
      label,
      val,
      pct: Math.round((val / total) * 100),
    }));
  }, [detailed, report.sewing.out, report.personal.out]);

  const topCategory = useMemo(() => {
    const sorted = [...breakdown].sort((a, b) => b.val - a.val);
    return sorted[0] && sorted[0].val > 0 ? sorted[0] : null;
  }, [breakdown]);

  // Smart Advisor metrics
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remDays =
    selectedMonth === currentYM() ? Math.max(1, daysInMonth - now.getDate() + 1) : daysInMonth;
  const openDebts = db.homeDebts.reduce((s, d) => s + debtRemaining(d), 0);
  const unpaidObl = db.obligations
    .filter((o) => !o.paidMonths?.includes(selectedMonth))
    .reduce((s, o) => s + o.amount, 0);
  const forecastAfterObl = report.home.balance - unpaidObl - openDebts;
  const dailySafe = Math.max(0, report.home.balance / remDays);

  // 6-Month Trend Chart Data
  const sixMonths = useMemo(() => {
    const arr = [];
    for (let i = 5; i >= 0; i--) {
      const m = shiftYM(selectedMonth, -i);
      const r = computeCashReportForMonth(db, m);
      arr.push({
        ym: m,
        label: formatYM(m).split(' ')[0],
        income: r.combined.income,
        out: r.combined.out,
      });
    }
    const maxVal = Math.max(1, ...arr.map((x) => Math.max(x.income, x.out)));
    return { arr, maxVal };
  }, [db, selectedMonth]);

  // Filtered Transaction Log
  const filteredTx = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return report.arr.filter((t) => {
      const acc = transactionAccount(t);
      if (logAccount !== 'all' && acc !== logAccount) return false;
      const isTransfer = t.cat === 'transfer' || t.cat === 'account_transfer';
      if (logType === 'transfer' && !isTransfer) return false;
      if (logType === 'in' && (t.type !== 'in' || isTransfer)) return false;
      if (logType === 'out' && (t.type !== 'out' || isTransfer)) return false;
      if (logCat !== 'all') {
        if (logCat === 'sew' && acc !== 'sewing') return false;
        if (logCat !== 'sew' && t.cat !== logCat) return false;
      }
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !(t.person || '').toLowerCase().includes(q) &&
        !(t.shop || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.arr, logAccount, logType, logCat, logSearch]);

  const handleCopyReport = async () => {
    const text = [
      `📊 التقرير المالي — ${formatYM(selectedMonth)}`,
      `• إجمالي الدخل: ${fmt(report.combined.income)}`,
      `• إجمالي المصاريف: ${fmt(report.combined.out)}`,
      `• رصيد العائلة: ${fmt(report.home.balance)}`,
      `• رصيد الخياطة: ${fmt(report.sewing.balance)}`,
      `• رصيد الشخصي: ${fmt(report.personal.balance)}`,
      `• الرصيد التراكمي الكلي: ${fmt(report.combined.balance)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      onNotify('تم نسخ ملخص التقرير الشهري');
    } catch {
      onNotify('تعذر النسخ التلقائي');
    }
  };

  const handleExportCSV = () => {
    const rows = [
      ['التاريخ', 'الحساب', 'النوع', 'البند', 'البيان', 'المبلغ'],
      ...report.arr.map((t) => [
        t.dateISO || t.date,
        ACC_LABELS[transactionAccount(t)],
        t.type === 'in' ? 'وارد' : 'صادر',
        t.cat,
        `"${(t.name || '').replace(/"/g, '""')}"`,
        String(t.amount),
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandooqi-report-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('تم تنزيل التقرير بصيغة Excel / CSV');
  };

  return (
    <div className="space-y-4">
      {/* Main Monthly Report Sheet */}
      <section className="print-only-sheet rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              📈 التقرير المالي الشهري — {formatYM(selectedMonth)}
            </h2>
            <p className="text-xs text-slate-500">ملخص الدخل والمصاريف والأرصدة عبر كل الحسابات</p>
          </div>
          <div className="no-print flex flex-wrap items-center gap-1.5">
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
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700"
            >
              <Copy className="h-3.5 w-3.5" />
              نسخ
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1 rounded-xl border border-emerald-600 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300"
            >
              <Download className="h-3.5 w-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Printer className="h-3.5 w-3.5" />
              PDF / طباعة
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
            <div className="text-xs text-slate-500">صافي حركة الشهر</div>
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

        {/* Deficit warning */}
        {report.home.balance < 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 text-rose-600" />
              <span>تنبيه عجز: المصاريف والاقتطاعات أكبر من مدخول الصندوق العائلي</span>
            </div>
            <strong className={`tabular-nums text-sm font-bold text-rose-600 ${blurCls}`}>
              {fmt(Math.abs(report.home.balance))}
            </strong>
          </div>
        )}

        {/* 3 Breakdown Boxes: Income / Deductions / Expenses */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <h3 className="font-bold text-emerald-800 dark:text-emerald-300">💰 حساب المدخول (العائلي)</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>الراتب الأول:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(report.salary.s1)}</strong>
              </div>
              <div className="flex justify-between">
                <span>الراتب الثاني:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(report.salary.s2)}</strong>
              </div>
              <div className="flex justify-between">
                <span>المرحّل من الشهر السابق:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(report.home.opening)}</strong>
              </div>
              <div className="flex justify-between">
                <span>التحويلات الواردة:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(report.home.transferIn)}</strong>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 text-xs dark:border-rose-900/50 dark:bg-rose-950/20">
            <h3 className="font-bold text-rose-800 dark:text-rose-300">💳 حساب الاقتطاعات</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>فاسيليتي:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(detailed.fac)}</strong>
              </div>
              <div className="flex justify-between">
                <span>خدمات:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(detailed.srv)}</strong>
              </div>
              <div className="flex justify-between">
                <span>حصّالة وادخار:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(detailed.sav)}</strong>
              </div>
              <div className="flex justify-between border-t border-rose-200/70 pt-1 font-bold dark:border-rose-900">
                <span>المجموع:</span>
                <span className={`tabular-nums ${blurCls}`}>{fmt(detailed.dedSum)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/20">
            <h3 className="font-bold text-amber-800 dark:text-amber-300">🛒 حساب المصاريف</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between">
                <span>المصروف المنزلي:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(detailed.shop)}</strong>
              </div>
              <div className="flex justify-between">
                <span>الفواتير وتسديد الديون:</span>
                <strong className={`tabular-nums ${blurCls}`}>
                  {fmt(detailed.bills + detailed.debtsPaid)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>العائلة:</span>
                <strong className={`tabular-nums ${blurCls}`}>{fmt(detailed.fam)}</strong>
              </div>
              <div className="flex justify-between border-t border-amber-200/70 pt-1 font-bold dark:border-amber-900">
                <span>المجموع:</span>
                <span className={`tabular-nums ${blurCls}`}>{fmt(detailed.expSum)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown Bars */}
        <div className="mt-4 space-y-2">
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

      {/* Smart Advisor */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-900 dark:text-emerald-200">
            <Brain className="h-4 w-4 text-emerald-600" />
            <span>المساعد المالي الذكي للشهر</span>
          </h3>
          <span
            className={`rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${
              forecastAfterObl >= 0
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {forecastAfterObl >= 0 ? 'متوازن' : 'يحتاج ضبط'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-xl bg-white p-2.5 text-xs dark:bg-slate-900">
            <div className="text-slate-500">المسموح يومياً</div>
            <strong className={`tabular-nums text-sm ${blurCls}`}>{fmt(dailySafe)}</strong>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-xs dark:bg-slate-900">
            <div className="text-slate-500">الأيام المتبقية</div>
            <strong className="tabular-nums text-sm">{remDays} يوم</strong>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-xs dark:bg-slate-900">
            <div className="text-slate-500">أعلى بند إنفاق</div>
            <strong className="text-sm">{topCategory ? topCategory.label : '—'}</strong>
          </div>
          <div className="rounded-xl bg-white p-2.5 text-xs dark:bg-slate-900">
            <div className="text-slate-500">المتوقع بعد الالتزامات</div>
            <strong
              className={`tabular-nums text-sm ${
                forecastAfterObl >= 0 ? 'text-emerald-700' : 'text-rose-600'
              } ${blurCls}`}
            >
              {fmt(forecastAfterObl)}
            </strong>
          </div>
        </div>
        <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300">
          {prevReport.combined.out > 0
            ? `مقارنة بالشهر السابق: مصاريف هذا الشهر ${
                report.combined.out <= prevReport.combined.out ? 'أقل' : 'أعلى'
              } بفارق ${fmt(Math.abs(report.combined.out - prevReport.combined.out))}.`
            : 'تظهر المقارنة التلقائية مع الشهر السابق بمجرد تسجيل عمليات في شهرين.'}
        </p>
      </section>

      {/* 6-Month Trend Bar Chart */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span>تحليل الاتجاه المالي (آخر 6 أشهر)</span>
          </h3>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2.5 w-2.5 rounded-xs bg-emerald-600" /> الدخل
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-2.5 w-2.5 rounded-xs bg-rose-500" /> المصاريف
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-6 items-end gap-2 pt-2">
          {sixMonths.arr.map((m) => {
            const hInc = Math.max(4, Math.round((m.income / sixMonths.maxVal) * 96));
            const hOut = Math.max(4, Math.round((m.out / sixMonths.maxVal) * 96));
            return (
              <div key={m.ym} className="flex flex-col items-center gap-1">
                <div className="flex h-24 items-end gap-1">
                  <div
                    className="w-3 rounded-t bg-emerald-600"
                    style={{ height: `${hInc}px` }}
                    title={`الدخل: ${fmt(m.income)}`}
                  />
                  <div
                    className="w-3 rounded-t bg-rose-500"
                    style={{ height: `${hOut}px` }}
                    title={`المصاريف: ${fmt(m.out)}`}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{m.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Month Summary & Archive */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold">📆 ملخص الأشهر وإغلاق الشهر</h3>
          <button
            type="button"
            onClick={onOpenMonthClose}
            className="no-print rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            🌙 إغلاق الشهر وترحيل الرصيد
          </button>
        </div>
        {Object.keys(db.monthArchive).length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">لا توجد أشهر مغلقة بعد.</p>
        ) : (
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
        )}
      </section>

      {/* Complete Transaction Log with Filters */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-bold">🧾 سجل عمليات {formatYM(selectedMonth)} ({filteredTx.length})</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="ابحث..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-8 pl-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <select
            value={logAccount}
            onChange={(e) => setLogAccount(e.target.value as 'all' | AccountId)}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">كل الحسابات</option>
            <option value="family">الحساب العائلي</option>
            <option value="personal">الحساب الشخصي</option>
            <option value="sewing">صندوق الخياطة</option>
          </select>
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value as 'all' | 'in' | 'out' | 'transfer')}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">كل الأنواع</option>
            <option value="in">وارد فقط</option>
            <option value="out">صادر فقط</option>
            <option value="transfer">تحويل داخلي</option>
          </select>
          <select
            value={logCat}
            onChange={(e) => setLogCat(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">كل البنود</option>
            <option value="exp">المشتريات</option>
            <option value="bill">الفواتير</option>
            <option value="fam">العائلة</option>
            <option value="fac">فاسيليتي</option>
            <option value="srv">خدمات</option>
            <option value="sav">الادخار</option>
            <option value="debt_payment">تسديد الديون</option>
            <option value="sew">عمليات الخياطة</option>
          </select>
        </div>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredTx.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">لا توجد عمليات مطابقة.</p>
          ) : (
            filteredTx.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 py-2.5 text-xs">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="text-slate-500">
                    {ACC_LABELS[transactionAccount(t)]} · {t.date}
                    {t.person ? ` · ${t.person}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`tabular-nums font-bold ${
                      t.type === 'in' ? 'text-emerald-700' : 'text-rose-600'
                    } ${blurCls}`}
                  >
                    {t.type === 'in' ? '+' : '−'}
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
            ))
          )}
        </div>
      </section>
    </div>
  );
};
