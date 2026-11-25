import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Mic,
  PiggyBank,
  Scissors,
  ShoppingBasket,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { AppPage, BudgetAllocationItem, SandooqiDB } from '../types/sandooqi';
import {
  computeCashReportForMonth,
  currentYM,
  daysUntil,
  debtRemaining,
  fmt,
  formatYM,
  getTxYM,
} from '../utils/finance';
import { BudgetOrganizerSection } from './BudgetOrganizerSection';

interface HomeViewProps {
  db: SandooqiDB;
  onNavigate: (page: AppPage) => void;
  onOpenVoice: () => void;
  onQuickExpense: (title: string, amount: number) => void;
  onOpenMonthClose: () => void;
  onUpdateBudgetTotal: (override: number | null) => void;
  onUpdateBudgetItemAmount: (id: string, amount: number) => void;
  onAddBudgetItem: (label: string, amount: number) => void;
  onDeleteBudgetItem: (id: string) => void;
  onRecordBudgetExpense: (item: BudgetAllocationItem) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  db,
  onNavigate,
  onOpenVoice,
  onQuickExpense,
  onOpenMonthClose,
  onUpdateBudgetTotal,
  onUpdateBudgetItemAmount,
  onAddBudgetItem,
  onDeleteBudgetItem,
  onRecordBudgetExpense,
}) => {
  const ym = currentYM();
  const report = computeCashReportForMonth(db, ym);
  const privacy = db.privacyMode;
  const blurCls = privacy ? 'privacy-blur' : '';

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
  const dailySafeBudget = Math.max(0, report.home.balance / remainingDays);
  const totalInflow = report.home.opening + report.home.income + Math.max(0, report.home.transfer);
  const spentPct =
    totalInflow > 0 ? Math.min(100, Math.round((report.home.out / totalInflow) * 100)) : 0;

  // Alerts calculation
  const openDebts = db.homeDebts.filter((d) => debtRemaining(d) > 0);
  const totalOpenDebts = openDebts.reduce((s, d) => s + debtRemaining(d), 0);
  const overdueDebts = openDebts.filter((d) => {
    const du = daysUntil(d.due);
    return du !== null && du <= 3;
  });

  const unpaidBills = db.obligations.filter((o) => !o.paidMonths?.includes(ym));
  const expiringWarranties = db.warranties.filter((w) => {
    const d = daysUntil(w.warrantyEndDateIso);
    return d !== null && d >= 0 && d <= 30;
  });

  const activeOrders = db.orders.filter((o) => o.stage !== 'مسلّم');
  const totalGoalsSaved = db.goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);
  const pendingClosure = db.monthClosePending[0];

  // Family member spend this month
  const monthFamilySpend = db.family.map((member) => {
    const spent = db.tx
      .filter((t) => getTxYM(t) === ym && t.type === 'out' && t.person === member)
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return { member, spent };
  });

  return (
    <div className="space-y-4">
      {/* Pending Month Close Notice */}
      {pendingClosure && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-amber-900 dark:text-amber-200">
            <CalendarClock className="h-4 w-4 shrink-0" />
            <span>
              يوجد شهر سابق ({formatYM(pendingClosure.month)}) بانتظار الإغلاق وترحيل الفائض إلى{' '}
              {formatYM(pendingClosure.target)}.
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenMonthClose}
            className="rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
          >
            مراجعة وإغلاق الشهر
          </button>
        </div>
      )}

      {/* Hero Cash Balance Card */}
      <section className="rounded-2xl border border-emerald-700 bg-gradient-to-br from-emerald-700 via-emerald-700 to-emerald-900 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-100">
              <span>رصيد الصندوق العائلي · {formatYM(ym)}</span>
              <span>·</span>
              <span>الراتب: {fmt(report.salary.s1 + report.salary.s2)}</span>
            </div>
            <div className={`tabular-nums mt-2 text-3xl font-bold tracking-tight ${blurCls}`}>
              {fmt(report.home.balance)}
            </div>
            <p className="mt-1 text-xs text-emerald-100">
              الحد اليومي الآمن لبقية الشهر ({remainingDays} يوماً):{' '}
              <strong className={`tabular-nums text-amber-200 ${blurCls}`}>
                {fmt(dailySafeBudget)} / يوم
              </strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onOpenVoice}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/25"
            >
              <Mic className="h-4 w-4" />
              <span>تسجيل بالصوت</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-300 px-3.5 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-200"
            >
              <ShoppingBasket className="h-4 w-4" />
              <span>تسجيل مصروف</span>
            </button>
          </div>
        </div>

        {/* Spending Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs text-emerald-100">
            <span>المصروف هذا الشهر: <span className={`tabular-nums font-bold ${blurCls}`}>{fmt(report.home.out)}</span></span>
            <span className="tabular-nums font-semibold">{spentPct}% من المتاح</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-emerald-950/50">
            <div
              className={`h-full transition-all ${
                spentPct >= 90 ? 'bg-rose-400' : spentPct >= 75 ? 'bg-amber-300' : 'bg-emerald-300'
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
        </div>

        {/* 3 Accounts Summary Row */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-white/15 pt-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => onNavigate('treasury')}
            className="rounded-xl bg-white/10 px-3 py-2 text-start transition-colors hover:bg-white/15"
          >
            <div className="text-[11px] text-emerald-100">الحساب العائلي</div>
            <div className={`tabular-nums mt-0.5 text-sm font-bold ${blurCls}`}>
              {fmt(report.home.balance)}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('treasury')}
            className="rounded-xl bg-white/10 px-3 py-2 text-start transition-colors hover:bg-white/15"
          >
            <div className="text-[11px] text-emerald-100">الحساب الشخصي</div>
            <div className={`tabular-nums mt-0.5 text-sm font-bold ${blurCls}`}>
              {fmt(report.personal.balance)}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('treasury')}
            className="rounded-xl bg-white/10 px-3 py-2 text-start transition-colors hover:bg-white/15"
          >
            <div className="text-[11px] text-emerald-100">حساب الخياطة</div>
            <div className={`tabular-nums mt-0.5 text-sm font-bold ${blurCls}`}>
              {fmt(report.sewing.balance)}
            </div>
          </button>
        </div>
      </section>

      {/* Interactive Budget Organizer directly on Home */}
      <BudgetOrganizerSection
        db={db}
        onUpdateBudgetTotal={onUpdateBudgetTotal}
        onUpdateBudgetItemAmount={onUpdateBudgetItemAmount}
        onAddBudgetItem={onAddBudgetItem}
        onDeleteBudgetItem={onDeleteBudgetItem}
        onRecordBudgetExpense={onRecordBudgetExpense}
      />

      {/* Alerts & Reminders */}
      {(overdueDebts.length > 0 || unpaidBills.length > 0 || expiringWarranties.length > 0) && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-800 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>تنبيهات مالية تستوجب المراجعة</span>
          </div>
          <div className="mt-2.5 divide-y divide-rose-200/70 dark:divide-rose-900/50">
            {overdueDebts.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="flex w-full items-center justify-between py-2 text-start text-xs font-semibold text-rose-900 dark:text-rose-200"
              >
                <span>ديون محلات مستحقة أو قريبة الاستحقاق ({overdueDebts.length})</span>
                <span className="inline-flex items-center gap-1 underline">
                  عرض <ArrowLeft className="h-3 w-3" />
                </span>
              </button>
            )}
            {unpaidBills.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('bills')}
                className="flex w-full items-center justify-between py-2 text-start text-xs font-semibold text-rose-900 dark:text-rose-200"
              >
                <span>فواتير والتزامات شهرية غير مدفوعة ({unpaidBills.length})</span>
                <span className="inline-flex items-center gap-1 underline">
                  تسديد <ArrowLeft className="h-3 w-3" />
                </span>
              </button>
            )}
            {expiringWarranties.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('tools')}
                className="flex w-full items-center justify-between py-2 text-start text-xs font-semibold text-rose-900 dark:text-rose-200"
              >
                <span>ضمانات أجهزة تنتهي خلال 30 يوماً ({expiringWarranties.length})</span>
                <span className="inline-flex items-center gap-1 underline">
                  الأرشيف <ArrowLeft className="h-3 w-3" />
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Quick 1-Tap Expenses */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            مصاريف يومية بضغطة واحدة
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            تعديل الاختصارات
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {db.quickExpenses.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onQuickExpense(q.title, q.amount)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-start transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-950/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{q.emoji}</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {q.title}
                </span>
              </div>
              <span className={`tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                {fmt(q.amount)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Domain Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('bills')}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              ديون المحلات المفتوحة
            </div>
            <div className={`tabular-nums mt-1 text-lg font-bold text-rose-600 dark:text-rose-400 ${blurCls}`}>
              {fmt(totalOpenDebts)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">{openDebts.length} دين مفتوح</div>
          </div>
          <Wallet className="h-6 w-6 text-rose-500" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('goals')}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              إجمالي المدخرات
            </div>
            <div className={`tabular-nums mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
              {fmt(totalGoalsSaved)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {db.goals.length} حصّالة · {db.seasonalBudgets.length} موسم
            </div>
          </div>
          <PiggyBank className="h-6 w-6 text-emerald-600" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('tailoring')}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              طلبيات الخياطة النشطة
            </div>
            <div className="tabular-nums mt-1 text-lg font-bold text-violet-700 dark:text-violet-400">
              {activeOrders.length} طلبية
            </div>
            <div className={`tabular-nums mt-0.5 text-[11px] text-slate-500 ${blurCls}`}>
              رصيد الورشة: {fmt(report.sewing.balance)}
            </div>
          </div>
          <Scissors className="h-6 w-6 text-violet-600" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              صافي الشهر (الدخل − الخروج)
            </div>
            <div
              className={`tabular-nums mt-1 text-lg font-bold ${
                report.combined.net >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              } ${blurCls}`}
            >
              {fmt(report.combined.net)}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {report.arr.length} عملية مسجلة
            </div>
          </div>
          <TrendingUp className="h-6 w-6 text-sky-600" />
        </button>
      </div>

      {/* Family Spending Breakdown */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            مصاريف أفراد العائلة ({formatYM(ym)})
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('tools')}
            className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
          >
            إدارة الأعضاء
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {monthFamilySpend.map((f) => (
            <div
              key={f.member}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {f.member}
              </div>
              <div className={`tabular-nums mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                {fmt(f.spent)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
