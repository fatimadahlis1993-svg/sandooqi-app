import React, { useState } from 'react';
import { ArrowDownLeft, PiggyBank, Plus, Sparkles, Trash2 } from 'lucide-react';
import { BudgetAllocationItem, Goal, SandooqiDB, SeasonalBudget } from '../types/sandooqi';
import { daysUntil, fmt } from '../utils/finance';
import { BudgetOrganizerSection } from './BudgetOrganizerSection';

interface GoalsViewProps {
  db: SandooqiDB;
  onUpdateBudgetTotal: (override: number | null) => void;
  onUpdateBudgetItemAmount: (id: string, amount: number) => void;
  onAddBudgetItem: (label: string, amount: number) => void;
  onDeleteBudgetItem: (id: string) => void;
  onRecordBudgetExpense: (item: BudgetAllocationItem) => void;
  onAddGoal: (name: string, target: number) => void;
  onDepositGoal: (goal: Goal, presetAmount?: number) => void;
  onWithdrawGoal: (goal: Goal) => void;
  onDeleteGoal: (id: number) => void;
  onAddSeasonal: (payload: {
    name: string;
    occasionType: string;
    emoji: string;
    targetAmount: number;
    targetDateIso: string;
    notes?: string;
  }) => void;
  onDepositSeasonal: (budget: SeasonalBudget) => void;
  onDeleteSeasonal: (id: number) => void;
  onUpdateBudgets: (groceryBudget: number, marketBudget: number) => void;
}

const GOAL_PRESETS = [
  '💰 التوفير العام',
  '📱 شراء هاتف',
  '💻 شراء حاسوب',
  '🚗 شراء سيارة',
  '🛋️ شراء أثاث للمنزل',
  '🏠 تجهيز المنزل',
  '🎉 العيد والمناسبات',
  '✈️ السفر والعطلة',
  '📚 الدراسة والتعليم',
  '🧰 صندوق الطوارئ',
  '💍 الزواج',
  '🧵 مشروع خاص',
  'custom',
];

const SEASON_PRESETS = [
  { type: 'رمضان', emoji: '🌙' },
  { type: 'عيد الفطر', emoji: '✨' },
  { type: 'عيد الأضحى', emoji: '🐑' },
  { type: 'الدخول المدرسي', emoji: '🎒' },
  { type: 'أعراس ومناسبات', emoji: '💐' },
];

export const GoalsView: React.FC<GoalsViewProps> = ({
  db,
  onUpdateBudgetTotal,
  onUpdateBudgetItemAmount,
  onAddBudgetItem,
  onDeleteBudgetItem,
  onRecordBudgetExpense,
  onAddGoal,
  onDepositGoal,
  onWithdrawGoal,
  onDeleteGoal,
  onAddSeasonal,
  onDepositSeasonal,
  onDeleteSeasonal,
  onUpdateBudgets,
}) => {
  const [goalPreset, setGoalPreset] = useState('💰 التوفير العام');
  const [goalNameCustom, setGoalNameCustom] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const [seasonType, setSeasonType] = useState('رمضان');
  const [seasonEmoji, setSeasonEmoji] = useState('🌙');
  const [seasonName, setSeasonName] = useState('');
  const [seasonTarget, setSeasonTarget] = useState('');
  const [seasonDate, setSeasonDate] = useState('');
  const [seasonNotes, setSeasonNotes] = useState('');

  const [gBudget, setGBudget] = useState(String(db.groceryBudget));
  const [mBudget, setMBudget] = useState(String(db.marketBudget));

  const blurCls = db.privacyMode ? 'privacy-blur' : '';
  const totalSaved = db.goals.reduce((s, g) => s + (Number(g.saved) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Budget Organizer */}
      <BudgetOrganizerSection
        db={db}
        onUpdateBudgetTotal={onUpdateBudgetTotal}
        onUpdateBudgetItemAmount={onUpdateBudgetItemAmount}
        onAddBudgetItem={onAddBudgetItem}
        onDeleteBudgetItem={onDeleteBudgetItem}
        onRecordBudgetExpense={onRecordBudgetExpense}
      />

      {/* Savings Summary Strip */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-700 bg-emerald-700 p-4 text-white">
          <div className="text-xs text-emerald-100">إجمالي ما ادّخرته في الحصّالات</div>
          <div className={`tabular-nums mt-1 text-xl font-bold ${blurCls}`}>{fmt(totalSaved)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500">عدد أهداف الادخار</div>
          <div className="tabular-nums mt-1 text-xl font-bold">{db.goals.length} هدف</div>
        </div>
      </div>

      {/* Savings Goals */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <PiggyBank className="h-4 w-4 text-emerald-600" />
          <span>حصّالات وأهداف الادخار</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = Number(goalTarget);
            const finalName =
              goalPreset === 'custom'
                ? goalNameCustom.trim()
                : goalPreset.replace(/^[^\s]+\s/, '').trim() || goalPreset;
            if (!finalName || !Number.isFinite(t) || t <= 0) return;
            onAddGoal(finalName, t);
            setGoalNameCustom('');
            setGoalTarget('');
          }}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3"
        >
          <select
            value={goalPreset}
            onChange={(e) => setGoalPreset(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
          >
            {GOAL_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p === 'custom' ? '✏️ هدف مخصص (اكتب اسمه)' : p}
              </option>
            ))}
          </select>
          {goalPreset === 'custom' && (
            <input
              type="text"
              required
              value={goalNameCustom}
              onChange={(e) => setGoalNameCustom(e.target.value)}
              placeholder="اكتب اسم هدفك..."
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          )}
          <input
            type="number"
            min={1}
            required
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            placeholder="المبلغ المستهدف (دج)"
            className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            إنشاء هدف ادخار
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {db.goals.map((g) => {
            const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {g.name}
                    </div>
                    <div className={`tabular-nums text-xs text-slate-500 ${blurCls}`}>
                      المدخر: {fmt(g.saved)} / {fmt(g.target)} ({pct}%)
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onDepositGoal(g)}
                      className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      + إيداع
                    </button>
                    {g.saved > 0 && (
                      <button
                        type="button"
                        onClick={() => onWithdrawGoal(g)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-300 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        سحب
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(g.id)}
                      aria-label="حذف"
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Quick deposit chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => onDepositGoal(g, amt)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      +{amt} دج
                    </button>
                  ))}
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seasonal & Occasion Budgets */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>ميزانيات المواسم والمناسبات</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SEASON_PRESETS.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => {
                setSeasonType(p.type);
                setSeasonEmoji(p.emoji);
                if (!seasonName.trim()) setSeasonName(p.type);
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                seasonType === p.type
                  ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'
                  : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {p.emoji} {p.type}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = Number(seasonTarget);
            if (!Number.isFinite(t) || t <= 0) return;
            onAddSeasonal({
              name: seasonName.trim() || seasonType,
              occasionType: seasonType,
              emoji: seasonEmoji,
              targetAmount: t,
              targetDateIso: seasonDate,
              notes: seasonNotes.trim() || undefined,
            });
            setSeasonName('');
            setSeasonTarget('');
            setSeasonDate('');
            setSeasonNotes('');
          }}
          className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          <input
            type="text"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
            placeholder="اسم المناسبة"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="number"
            min={1}
            value={seasonTarget}
            onChange={(e) => setSeasonTarget(e.target.value)}
            placeholder="المبلغ المطلوب (دج)"
            className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="date"
            value={seasonDate}
            onChange={(e) => setSeasonDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="text"
            value={seasonNotes}
            onChange={(e) => setSeasonNotes(e.target.value)}
            placeholder="تفاصيل / لوازم (اختياري)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="sm:col-span-2 rounded-xl bg-amber-600 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            ➕ إنشاء خطة الموسم
          </button>
        </form>

        <div className="mt-4 space-y-2.5">
          {db.seasonalBudgets.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              أضف مناسبة مثل رمضان أو الأعياد لحساب المبلغ الشهري المطلوب ادخاره تلقائياً.
            </p>
          ) : (
            db.seasonalBudgets.map((b) => {
              const rem = Math.max(0, b.targetAmount - b.savedAmount);
              const pct =
                b.targetAmount > 0
                  ? Math.min(100, Math.round((b.savedAmount / b.targetAmount) * 100))
                  : 0;
              const d = daysUntil(b.targetDateIso);
              const months = d !== null && d > 0 ? Math.max(1, Math.ceil(d / 30)) : 1;
              const perMonth = rem > 0 ? rem / months : 0;

              return (
                <div
                  key={b.id}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold">
                        {b.emoji} {b.name}
                      </div>
                      <div className={`tabular-nums text-xs text-slate-500 ${blurCls}`}>
                        {fmt(b.savedAmount)} / {fmt(b.targetAmount)} ({pct}%)
                        {rem > 0 && b.targetDateIso
                          ? ` · المطلوب شهرياً (${months} شهر): ${fmt(perMonth)}`
                          : ''}
                      </div>
                      {b.notes && <div className="text-[11px] text-slate-400">{b.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDepositSeasonal(b)}
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        + إيداع
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSeasonal(b.id)}
                        aria-label="حذف"
                        className="rounded p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Monthly Budget Thresholds */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          حدود الميزانية الشهرية
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onUpdateBudgets(Math.max(0, Number(gBudget) || 0), Math.max(0, Number(mBudget) || 0));
          }}
          className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              سقف المقاضي الشهري (دج)
            </label>
            <input
              type="number"
              min={0}
              value={gBudget}
              onChange={(e) => setGBudget(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              سقف قائمة السوق (دج)
            </label>
            <input
              type="number"
              min={0}
              value={mBudget}
              onChange={(e) => setMBudget(e.target.value)}
              className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 py-2 text-sm font-bold text-white hover:bg-slate-800 dark:bg-emerald-700"
            >
              تحديث الحدود
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
