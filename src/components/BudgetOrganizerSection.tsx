import React, { useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { BudgetAllocationItem, SandooqiDB } from '../types/sandooqi';
import { computeCashReportForMonth, currentYM, fmt } from '../utils/finance';

interface BudgetOrganizerSectionProps {
  db: SandooqiDB;
  onUpdateBudgetTotal: (override: number | null) => void;
  onUpdateBudgetItemAmount: (id: string, amount: number) => void;
  onAddBudgetItem: (label: string, amount: number) => void;
  onDeleteBudgetItem: (id: string) => void;
  onRecordBudgetExpense: (item: BudgetAllocationItem) => void;
}

export const BudgetOrganizerSection: React.FC<BudgetOrganizerSectionProps> = ({
  db,
  onUpdateBudgetTotal,
  onUpdateBudgetItemAmount,
  onAddBudgetItem,
  onDeleteBudgetItem,
  onRecordBudgetExpense,
}) => {
  const ym = currentYM();
  const report = useMemo(() => computeCashReportForMonth(db, ym), [db, ym]);
  const autoMonthlyBudget = Math.max(
    0,
    report.home.opening + report.home.income + Math.max(0, report.home.transfer)
  );

  const organizer = db.budgetOrganizer || {
    totalBudgetOverride: null,
    items: [
      { id: 'rent', label: 'الكراء', amount: 0, isDefault: true },
      { id: 'living', label: 'المصروف', amount: 0, isDefault: true },
    ],
  };
  const override = organizer.totalBudgetOverride;
  const effectiveBudget = override !== null ? override : autoMonthlyBudget;
  const items = organizer.items;

  const totalAllocated = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const remainingBudget = effectiveBudget - totalAllocated;
  const usedPct =
    effectiveBudget > 0 ? Math.min(100, Math.round((totalAllocated / effectiveBudget) * 100)) : 0;

  const [newLabel, setNewLabel] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');

  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    const amt = Math.max(0, Number(newAmount) || 0);
    if (!label || amt <= 0) return;
    onAddBudgetItem(label, amt);
    setNewLabel('');
    setNewAmount('');
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Calculator className="h-4 w-4 text-emerald-600" />
            <span>تنظيم الميزانية الشهرية</span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            وزّع ميزانيتك على الكراء والمصروف وأي بنود إضافية، ويتم الخصم من المتبقي تلقائياً.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {override !== null && (
            <button
              type="button"
              onClick={() => {
                onUpdateBudgetTotal(null);
                setEditingTotal(false);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>ربط بدخل الشهر</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setTotalDraft(String(Math.round(effectiveBudget)));
              setEditingTotal((prev) => !prev);
            }}
            className="rounded-xl border border-emerald-700 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            {editingTotal ? 'إغلاق التعديل' : 'تعديل مبلغ الميزانية'}
          </button>
        </div>
      </div>

      {/* Optional Custom Budget Total Input */}
      {editingTotal && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const val = Math.max(0, Number(totalDraft) || 0);
            onUpdateBudgetTotal(val);
            setEditingTotal(false);
          }}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/20"
        >
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            إجمالي الميزانية المراد تقسيمها (دج):
          </label>
          <input
            type="number"
            min={0}
            value={totalDraft}
            onChange={(e) => setTotalDraft(e.target.value)}
            className="tabular-nums w-40 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="submit"
            className="rounded-xl bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
          >
            اعتماد الميزانية
          </button>
        </form>
      )}

      {/* 3 Budget KPI Cards */}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            إجمالي الميزانية {override === null ? '(تلقائي من دخل الشهر)' : '(مبلغ مخصص)'}
          </div>
          <div className={`tabular-nums mt-1 text-lg font-bold text-slate-900 dark:text-slate-50 ${blurCls}`}>
            {fmt(effectiveBudget)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            مجموع المخصّص (يُنقص من الميزانية)
          </div>
          <div className={`tabular-nums mt-1 text-lg font-bold text-amber-700 dark:text-amber-400 ${blurCls}`}>
            − {fmt(totalAllocated)}
          </div>
        </div>

        <div
          className={`rounded-xl border p-3 ${
            remainingBudget < 0
              ? 'border-rose-300 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30'
              : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/30'
          }`}
        >
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {remainingBudget < 0 ? 'تجاوز الميزانية بمقدار' : 'المتبقي من الميزانية'}
          </div>
          <div
            className={`tabular-nums mt-1 text-lg font-bold ${
              remainingBudget < 0
                ? 'text-rose-700 dark:text-rose-400'
                : 'text-emerald-700 dark:text-emerald-400'
            } ${blurCls}`}
          >
            {fmt(Math.abs(remainingBudget))}
          </div>
        </div>
      </div>

      {/* Allocation Progress Bar */}
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>نسبة التوزيع من الميزانية</span>
          <span className="tabular-nums font-bold">{usedPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full transition-all ${
              remainingBudget < 0
                ? 'bg-rose-600'
                : usedPct >= 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
            }`}
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>

      {/* Items List (الكراء، المصروف، وأي تسمية مضافة) */}
      <div className="mt-4 space-y-2.5">
        {items.map((item) => {
          const sharePct =
            effectiveBudget > 0 ? Math.round((item.amount / effectiveBudget) * 100) : 0;
          return (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <div className="min-w-[120px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {item.label}
                  </span>
                  {effectiveBudget > 0 && item.amount > 0 && (
                    <span className="tabular-nums rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {sharePct}%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    aria-label={`مبلغ ${item.label}`}
                    value={item.amount === 0 ? '' : item.amount}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateBudgetItemAmount(item.id, Math.max(0, Number(e.target.value) || 0))
                    }
                    className="tabular-nums w-32 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="text-xs font-semibold text-slate-500">دج</span>
                </div>

                {item.amount > 0 && (
                  <button
                    type="button"
                    onClick={() => onRecordBudgetExpense(item)}
                    title="تسجيل المبلغ كمصروف فعلي مخصوم من الخزينة العائلية"
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-600 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>خصم من الخزينة</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onDeleteBudgetItem(item.id)}
                  aria-label={`حذف ${item.label}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Custom Label Form */}
      <form
        onSubmit={handleAdd}
        className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-3"
      >
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="إضافة أي تسمية (فواتير، دراسة، نقل، صحة...)"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
        />
        <input
          type="number"
          min={1}
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          placeholder="المبلغ (دج)"
          className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة واحتساب من الميزانية</span>
        </button>
      </form>
    </section>
  );
};
