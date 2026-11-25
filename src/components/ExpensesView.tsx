import React, { useMemo, useState } from 'react';
import { Camera, Check, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { SandooqiDB } from '../types/sandooqi';
import { currentYM, fmt, getTxYM } from '../utils/finance';
import { compressImageFile } from '../utils/storage';

interface ExpensesViewProps {
  db: SandooqiDB;
  onAddExpense: (payload: {
    title: string;
    amount: number;
    person: string;
    shop: string;
    payMode: 'cash' | 'debt';
    creditor: string;
    due: string;
    photo?: string;
  }) => void;
  onDeleteTransaction: (id: number) => void;
  onAddMarketItem: (name: string, price: number) => void;
  onToggleMarketItem: (id: number) => void;
  onDeleteMarketItem: (id: number) => void;
  onClearDoneMarket: () => void;
  onPreviewPhoto: (src: string, title: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  db,
  onAddExpense,
  onDeleteTransaction,
  onAddMarketItem,
  onToggleMarketItem,
  onDeleteMarketItem,
  onClearDoneMarket,
  onPreviewPhoto,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'market' | 'history'>('products');
  const [activeGroup, setActiveGroup] = useState<string>('الكل');
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Expense form state
  const [customTitle, setCustomTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState(db.family[0] || '');
  const [shop, setShop] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'debt'>('cash');
  const [creditor, setCreditor] = useState('');
  const [due, setDue] = useState('');
  const [photo, setPhoto] = useState('');

  // Market list input
  const [mktName, setMktName] = useState('');
  const [mktPrice, setMktPrice] = useState('');

  const groups = useMemo(() => {
    const set = new Set(db.catalog.map((c) => c.group));
    return ['الكل', ...Array.from(set)];
  }, [db.catalog]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.catalog.filter((c) => {
      if (activeGroup !== 'الكل' && c.group !== activeGroup) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [db.catalog, activeGroup, search]);

  const toggleProduct = (name: string) => {
    setSelectedItems((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const ym = currentYM();
  const monthExpenses = useMemo(
    () =>
      db.tx.filter(
        (t) =>
          getTxYM(t) === ym &&
          t.type === 'out' &&
          t.box === 'home' &&
          t.cat !== 'transfer' &&
          t.cat !== 'account_transfer'
      ),
    [db.tx, ym]
  );
  const monthExpenseTotal = monthExpenses.reduce((s, t) => s + Number(t.amount || 0), 0);

  const marketTotal = db.marketList.reduce(
    (s, m) => s + (Number(m.price) || 0) * (Number(m.quantity) || 1),
    0
  );
  const marketPct =
    db.marketBudget > 0 ? Math.min(100, Math.round((marketTotal / db.marketBudget) * 100)) : 0;

  const existingCreditors = useMemo(() => {
    return Array.from(new Set(db.homeDebts.map((d) => d.creditor).filter(Boolean)));
  }, [db.homeDebts]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    setPhoto(compressed);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    const combinedTitle =
      [...selectedItems, customTitle.trim()].filter(Boolean).join('، ') || 'مشتريات منزلية';
    onAddExpense({
      title: combinedTitle,
      amount: amt,
      person: person || db.family[0] || '',
      shop: shop.trim(),
      payMode,
      creditor: creditor.trim() || shop.trim() || 'محل',
      due,
      photo,
    });
    setSelectedItems([]);
    setCustomTitle('');
    setAmount('');
    setShop('');
    setCreditor('');
    setDue('');
    setPhoto('');
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            ['products', 'المنتجات والتسجيل'],
            ['market', `قائمة السوق (${db.marketList.length})`],
            ['history', `السجل (${monthExpenses.length})`],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className={`rounded-xl py-2 text-xs font-bold transition-colors ${
              subTab === k
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {subTab === 'products' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Product Catalog */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
            <div className="relative">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج (بطاطا، حليب، دجاج...)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-sm outline-none focus:border-emerald-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {groups.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setActiveGroup(g)}
                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    activeGroup === g
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {filteredCatalog.map((item) => {
                const isSelected = selectedItems.includes(item.name);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleProduct(item.name)}
                    className={`relative flex flex-col items-center rounded-xl border p-2.5 text-center transition-colors ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40'
                        : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/50'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-emerald-600 p-0.5 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <span className="text-2xl">{item.emoji}</span>
                    <span className="mt-1 text-xs font-bold leading-tight text-slate-800 dark:text-slate-100">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Expense Entry Form */}
          <section className="h-fit rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
                <span>تسجيل مصروف / شراء بالدين</span>
              </h3>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  مسح المحدد ({selectedItems.length})
                </button>
              )}
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
                المحدد: {selectedItems.join('، ')}
              </div>
            )}

            <form onSubmit={handleSubmitExpense} className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  وصف إضافي أو اسم الغرض
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="اختياري إذا حددت من المنتجات"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    المبلغ الإجمالي (دج)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    فرد العائلة
                  </label>
                  <select
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {db.family.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayMode('cash')}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    payMode === 'cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  دفع نقدي من الخزينة
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode('debt')}
                  className={`rounded-xl border py-2 text-xs font-bold ${
                    payMode === 'debt'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 dark:border-rose-500 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  شراء بالدين (كريدي)
                </button>
              </div>

              {payMode === 'debt' ? (
                <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
                  <input
                    type="text"
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    placeholder="اسم المحل أو الدائن"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                  {existingCreditors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {existingCreditors.slice(0, 5).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCreditor(c)}
                          className="rounded-lg border border-rose-200 bg-white px-2 py-0.5 text-xs font-medium text-rose-900 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-200"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      تاريخ الاستحقاق (اختياري)
                    </label>
                    <input
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={shop}
                  onChange={(e) => setShop(e.target.value)}
                  placeholder="اسم المحل (اختياري)"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              )}

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <Camera className="h-4 w-4" />
                  <span>{photo ? 'تم إرفاق صورة الوصل ✓' : 'إرفاق صورة الوصل'}</span>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={() => setPhoto('')}
                    className="text-xs font-semibold text-rose-600"
                  >
                    حذف الصورة
                  </button>
                )}
              </div>

              <button
                type="submit"
                className={`w-full rounded-xl py-2.5 text-sm font-bold text-white ${
                  payMode === 'debt'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {payMode === 'debt' ? 'تسجيل كدين على المحل' : 'تأكيد المصروف والخصم من الخزينة'}
              </button>
            </form>
          </section>
        </div>
      )}

      {subTab === 'market' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                قائمة السوق والمشتريات المخططة
              </h2>
              <p className="tabular-nums text-xs text-slate-500">
                التكلفة التقديرية: {fmt(marketTotal)} من ميزانية {fmt(db.marketBudget)} ({marketPct}%)
              </p>
            </div>
            {db.marketList.some((m) => m.done) && (
              <button
                type="button"
                onClick={onClearDoneMarket}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                حذف المكتمل
              </button>
            )}
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className={`h-full transition-all ${
                marketPct >= 100 ? 'bg-rose-600' : marketPct >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
              }`}
              style={{ width: `${marketPct}%` }}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!mktName.trim()) return;
              onAddMarketItem(mktName.trim(), Math.max(0, Number(mktPrice) || 0));
              setMktName('');
              setMktPrice('');
            }}
            className="mt-3 flex flex-wrap gap-2"
          >
            <input
              type="text"
              value={mktName}
              onChange={(e) => setMktName(e.target.value)}
              placeholder="اسم الغرض (مثلاً: زيت زيتون 2 لتر)"
              className="min-w-[180px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="number"
              min={0}
              value={mktPrice}
              onChange={(e) => setMktPrice(e.target.value)}
              placeholder="السعر التقديري"
              className="tabular-nums w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </form>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {db.marketList.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">قائمة السوق فارغة حالياً.</p>
            ) : (
              db.marketList.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={m.done}
                      onChange={() => onToggleMarketItem(m.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span className={`text-sm font-medium ${m.done ? 'line-through opacity-50' : ''}`}>
                      {m.name}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    {m.price > 0 && (
                      <span className="tabular-nums text-xs font-bold text-slate-600 dark:text-slate-300">
                        {fmt(m.price)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteMarketItem(m.id)}
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

      {subTab === 'history' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              مشتريات ومصاريف هذا الشهر
            </h2>
            <span className="tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400">
              {fmt(monthExpenseTotal)}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {monthExpenses.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                لا توجد مصاريف منزلية مسجلة في هذا الشهر.
              </p>
            ) : (
              monthExpenses.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {t.date}
                      {t.person ? ` · ${t.person}` : ''}
                      {t.shop ? ` · ${t.shop}` : ''}
                    </div>
                    {t.photo && (
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto(t.photo!, t.name)}
                        className="mt-1 text-[11px] font-semibold text-emerald-700 underline dark:text-emerald-400"
                      >
                        عرض صورة الوصل
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400">
                      {fmt(t.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(t.id)}
                      aria-label="حذف العملية"
                      className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
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
    </div>
  );
};
