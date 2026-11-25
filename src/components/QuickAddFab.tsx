import React, { useMemo, useState } from 'react';
import { Plus, ReceiptText, Scissors, ShoppingBasket, Vault, X } from 'lucide-react';
import { AccountId, AppPage, SandooqiDB } from '../types/sandooqi';
import { fmt } from '../utils/finance';

interface QuickAddFabProps {
  db: SandooqiDB;
  onQuickCashExpense: (title: string, amount: number, person: string) => void;
  onQuickStoreDebt: (creditor: string, item: string, amount: number, due: string) => void;
  onQuickMovement: (accountId: AccountId, type: 'in' | 'out', name: string, amount: number) => void;
  onNavigate: (page: AppPage) => void;
}

type FabTab = 'expense' | 'debt' | 'movement';

export const QuickAddFab: React.FC<QuickAddFabProps> = ({
  db,
  onQuickCashExpense,
  onQuickStoreDebt,
  onQuickMovement,
  onNavigate,
}) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FabTab>('expense');

  // Expense state
  const [expTitle, setExpTitle] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expPerson, setExpPerson] = useState(db.family[0] || '');

  // Debt state
  const [creditor, setCreditor] = useState('');
  const [debtItem, setDebtItem] = useState('');
  const [debtAmt, setDebtAmt] = useState('');
  const [debtDue, setDebtDue] = useState('');

  // Account movement state
  const [accId, setAccId] = useState<AccountId>('family');
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movName, setMovName] = useState('');
  const [movAmt, setMovAmt] = useState('');

  const creditorChips = useMemo(
    () => Array.from(new Set(db.homeDebts.map((d) => d.creditor).filter(Boolean))).slice(0, 6),
    [db.homeDebts]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="إضافة سريعة"
        className="no-print fixed bottom-28 left-4 z-30 flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg shadow-emerald-950/30 transition-transform hover:scale-105 hover:bg-emerald-800 active:scale-95 md:bottom-6 md:left-6"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="safe-bottom w-full max-w-md rounded-t-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Plus className="h-4 w-4 text-emerald-600" />
                <span>إضافة سريعة من أي مكان</span>
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-bold dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setTab('expense')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 ${
                  tab === 'expense'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <ShoppingBasket className="h-3.5 w-3.5" />
                <span>مصروف</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('debt')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 ${
                  tab === 'debt'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <ReceiptText className="h-3.5 w-3.5" />
                <span>دين محل</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('movement')}
                className={`inline-flex items-center justify-center gap-1 rounded-lg py-2 ${
                  tab === 'movement'
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Vault className="h-3.5 w-3.5" />
                <span>دخل/خياطة</span>
              </button>
            </div>

            {tab === 'expense' && (
              <div className="mt-3 space-y-3">
                {db.quickExpenses.length > 0 && (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {db.quickExpenses.slice(0, 4).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          onQuickCashExpense(q.title, q.amount, expPerson || db.family[0] || '');
                          setOpen(false);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center hover:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                      >
                        <div className="text-base">{q.emoji}</div>
                        <div className="text-[11px] font-bold">{q.title}</div>
                        <div className="tabular-nums text-[10px] text-emerald-700 dark:text-emerald-400">
                          {fmt(q.amount)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amt = Number(expAmt);
                    if (!expTitle.trim() || !Number.isFinite(amt) || amt <= 0) return;
                    onQuickCashExpense(expTitle.trim(), amt, expPerson || db.family[0] || '');
                    setExpTitle('');
                    setExpAmt('');
                    setOpen(false);
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="الغرض (خبز، خضر، مواصلات...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      required
                      value={expAmt}
                      onChange={(e) => setExpAmt(e.target.value)}
                      placeholder="المبلغ (دج)"
                      className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <select
                      value={expPerson}
                      onChange={(e) => setExpPerson(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      {db.family.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                  >
                    خصم المصروف من الخزينة
                  </button>
                </form>
              </div>
            )}

            {tab === 'debt' && (
              <div className="mt-3 space-y-2.5">
                {creditorChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {creditorChips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCreditor(c)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${
                          creditor === c
                            ? 'border-rose-600 bg-rose-600 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amt = Number(debtAmt);
                    if (!creditor.trim() || !debtItem.trim() || !Number.isFinite(amt) || amt <= 0) return;
                    onQuickStoreDebt(creditor.trim(), debtItem.trim(), amt, debtDue);
                    setCreditor('');
                    setDebtItem('');
                    setDebtAmt('');
                    setDebtDue('');
                    setOpen(false);
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    required
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    placeholder="اسم المحل أو الشخص"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    required
                    value={debtItem}
                    onChange={(e) => setDebtItem(e.target.value)}
                    placeholder="الغرض / البيان"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      required
                      value={debtAmt}
                      onChange={(e) => setDebtAmt(e.target.value)}
                      placeholder="المبلغ (دج)"
                      className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="date"
                      value={debtDue}
                      onChange={(e) => setDebtDue(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700"
                  >
                    تسجيل دين جديد
                  </button>
                </form>
              </div>
            )}

            {tab === 'movement' && (
              <div className="mt-3 space-y-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const amt = Number(movAmt);
                    if (!movName.trim() || !Number.isFinite(amt) || amt <= 0) return;
                    onQuickMovement(accId, movType, movName.trim(), amt);
                    setMovName('');
                    setMovAmt('');
                    setOpen(false);
                  }}
                  className="space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={accId}
                      onChange={(e) => setAccId(e.target.value as AccountId)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="family">الحساب العائلي</option>
                      <option value="personal">الحساب الشخصي</option>
                      <option value="sewing">صندوق الخياطة</option>
                    </select>
                    <select
                      value={movType}
                      onChange={(e) => setMovType(e.target.value as 'in' | 'out')}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="in">إيداع / مدخول (+)</option>
                      <option value="out">سحب / مصروف (−)</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    required
                    value={movName}
                    onChange={(e) => setMovName(e.target.value)}
                    placeholder="البيان (مكافأة، بيع، قماش...)"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    min={1}
                    required
                    value={movAmt}
                    onChange={(e) => setMovAmt(e.target.value)}
                    placeholder="المبلغ (دج)"
                    className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-sky-700 py-2.5 text-sm font-bold text-white hover:bg-sky-800"
                  >
                    تسجيل الحركة المالية
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onNavigate('tailoring');
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-600/40 bg-emerald-50 py-2 text-xs font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  <Scissors className="h-3.5 w-3.5" />
                  <span>الانتقال إلى قسم الخياطة لطلبية جديدة</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
