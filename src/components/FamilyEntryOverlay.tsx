import React, { useState } from 'react';
import { Lock, Plus } from 'lucide-react';
import { SandooqiDB } from '../types/sandooqi';
import { fmt, localDateISO, todayLabel } from '../utils/finance';
import { verifyPin } from '../utils/storage';

interface FamilyEntryOverlayProps {
  db: SandooqiDB;
  onSelectMember: (member: string) => void;
  onQuickExpense: (title: string, amount: number) => void;
  onManualExpense: (title: string, amount: number, shop: string) => void;
  onAddMarketItem: (name: string) => void;
  onToggleMarketDone: (id: number) => void;
  onUnlockAdmin: () => void;
}

export const FamilyEntryOverlay: React.FC<FamilyEntryOverlayProps> = ({
  db,
  onSelectMember,
  onQuickExpense,
  onManualExpense,
  onAddMarketItem,
  onToggleMarketDone,
  onUnlockAdmin,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [shop, setShop] = useState('');
  const [mktInput, setMktInput] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  if (!db.familyEntryOnlyMode) return null;

  const activeMember = db.activeFamilyMember || db.family[0] || 'فرد العائلة';
  const iso = localDateISO();
  const td = todayLabel();
  const todayLogs = db.tx.filter(
    (t) =>
      (t.dateISO === iso || t.date === td) &&
      t.type === 'out' &&
      t.person === activeMember
  );

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await verifyPin(pinInput.trim(), db.pin);
    if (ok) {
      setPinInput('');
      setPinError('');
      setShowPinDialog(false);
      onUnlockAdmin();
    } else {
      setPinError('الرمز السري غير صحيح');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8ef] pb-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-emerald-800 bg-emerald-700 px-4 py-3 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold">صندوقي — وضع العائلة</h1>
            <p className="text-xs text-emerald-100">
              تسجيل المشتريات اليومية فقط ({activeMember})
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setPinError('');
              setPinInput('');
              setShowPinDialog(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>وضع المدير</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            من يسجل المصروف الآن؟
          </h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {db.family.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onSelectMember(m)}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                  m === activeMember
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            مصاريف سريعة بضغطة واحدة
          </h2>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {db.quickExpenses.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onQuickExpense(q.title, q.amount)}
                className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-emerald-950/40"
              >
                <span className="text-lg">{q.emoji}</span>
                <span className="mt-0.5 text-xs font-bold">{q.title}</span>
                <span className="tabular-nums text-[11px] text-emerald-700 dark:text-emerald-400">
                  {fmt(q.amount)}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            تسجيل مصروف يدوي
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amt = Number(amount);
              if (!title.trim() || !Number.isFinite(amt) || amt <= 0) return;
              onManualExpense(title.trim(), amt, shop.trim());
              setTitle('');
              setAmount('');
              setShop('');
            }}
            className="mt-3 space-y-2.5"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="الغرض (مثلاً: خضر)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                placeholder="المبلغ (دج)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="text"
                placeholder="المحل (اختياري)"
                value={shop}
                onChange={(e) => setShop(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
            >
              تسجيل المصروف باسم {activeMember}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">قائمة السوق</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mktInput.trim()) return;
              onAddMarketItem(mktInput.trim());
              setMktInput('');
            }}
            className="mt-2.5 flex gap-2"
          >
            <input
              type="text"
              placeholder="أضف غرضاً لقائمة السوق..."
              value={mktInput}
              onChange={(e) => setMktInput(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </form>
          <div className="mt-3 space-y-2">
            {db.marketList.length === 0 ? (
              <p className="text-xs text-slate-500">لا توجد أغراض في قائمة السوق.</p>
            ) : (
              db.marketList.slice(0, 10).map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"
                >
                  <input
                    type="checkbox"
                    checked={m.done}
                    onChange={() => onToggleMarketDone(m.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span className={`text-sm ${m.done ? 'line-through opacity-55' : ''}`}>
                    {m.name}
                  </span>
                </label>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            مصاريف {activeMember} اليوم
          </h2>
          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {todayLogs.length === 0 ? (
              <p className="py-2 text-xs text-slate-500">لم تُسجل مصاريف اليوم بعد.</p>
            ) : (
              todayLogs.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.name}</span>
                  <strong className="tabular-nums text-rose-600 dark:text-rose-400">
                    {fmt(t.amount)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {showPinDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            onSubmit={handleVerifyPin}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-base font-bold">فتح وضع المدير الكامل</h3>
            <p className="mt-1 text-xs text-slate-500">
              أدخل الرمز السري للمدير (الافتراضي: 1234)
            </p>
            <input
              type="password"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="الرمز السري"
              className="tabular-nums mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
            />
            {pinError && <p className="mt-1.5 text-xs font-semibold text-rose-600">{pinError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPinDialog(false)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold dark:border-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
              >
                دخول
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
