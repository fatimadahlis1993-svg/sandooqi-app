import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { SandooqiDB } from '../types/sandooqi';
import { currentYM, fmt, getTxYM, localDateISO } from '../utils/finance';
import { compressImageFile } from '../utils/storage';

interface ExpensesViewProps {
  db: SandooqiDB;
  onAddExpense: (payload: {
    title: string;
    amount: number;
    person: string;
    shop: string;
    category?: string;
    dateISO?: string;
    payMode: 'cash' | 'debt';
    creditor: string;
    due: string;
    photo?: string;
  }) => void;
  onAddFamilyExpense: (payload: { person: string; category: string; amount: number }) => void;
  onDeleteTransaction: (id: number) => void;
  onAddMarketItem: (name: string, quantity: number, unit: string, price: number) => void;
  onUpdateMarketItem: (
    id: number,
    patch: { quantity?: number; unit?: string; price?: number }
  ) => void;
  onToggleMarketItem: (id: number, recordExpense: boolean) => void;
  onDeleteMarketItem: (id: number) => void;
  onClearDoneMarket: () => void;
  onUpdateMarketBudget: (budget: number) => void;
  onPreviewPhoto: (src: string, title: string) => void;
  onNotify: (msg: string) => void;
}

const EXPENSE_CATEGORIES = [
  'مواد غذائية',
  'خضر وفواكه',
  'لحوم وأسماك',
  'نقل ومواصلات',
  'صحة ودواء',
  'لوازم المنزل',
  'تعليم',
  'ملابس',
  'ترفيه',
  'أخرى',
];

const FAMILY_CATEGORIES: { value: string; label: string }[] = [
  { value: 'غذاء ومأكولات', label: '🍽️ غذاء ومأكولات' },
  { value: 'ملابس وأحذية', label: '👕 ملابس وأحذية' },
  { value: 'طبيب وعلاج وأدوية', label: '🩺 طبيب وعلاج وأدوية' },
  { value: 'تعليم ودراسة', label: '📚 تعليم ودراسة' },
  { value: 'نقل ومواصلات', label: '🚕 نقل ومواصلات' },
  { value: 'هاتف وإنترنت', label: '📱 هاتف وإنترنت' },
  { value: 'مستلزمات شخصية', label: '🧴 مستلزمات شخصية' },
  { value: 'ترفيه ونزهات', label: '🎮 ترفيه ونزهات' },
  { value: 'هدايا ومناسبات', label: '🎁 هدايا ومناسبات' },
  { value: 'دخان', label: '🚬 دخان' },
  { value: 'أخرى', label: '✏️ أخرى' },
];

const UNITS = ['حبة', 'كغ', 'غ', 'لتر', 'مل', 'كيس', 'علبة', 'ربطة', 'صندوق'];

function suggestMarketUnit(name: string): string {
  const n = name.trim();
  if (/حليب|زيت|ماء|عصير/.test(n)) return 'لتر';
  if (/بطاطا|بطاطس|طماطم|بصل|جزر|لحم|دجاج|سردين|سمك|تفاح|موز|برتقال|سكر|فرينة|سميد|دقيق/.test(n))
    return 'كغ';
  if (/معدنوس|قزبر|نعناع|سلاطة|خس/.test(n)) return 'ربطة';
  if (/طماطم مصبرة|ياغورت|تونة/.test(n)) return 'علبة';
  return 'حبة';
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  db,
  onAddExpense,
  onAddFamilyExpense,
  onDeleteTransaction,
  onAddMarketItem,
  onUpdateMarketItem,
  onToggleMarketItem,
  onDeleteMarketItem,
  onClearDoneMarket,
  onUpdateMarketBudget,
  onPreviewPhoto,
  onNotify,
}) => {
  const [subTab, setSubTab] = useState<'products' | 'market' | 'history'>('products');
  const [activeGroup, setActiveGroup] = useState<string>('الكل');
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Expense form state
  const [customTitle, setCustomTitle] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('حبة');
  const [showQtyBox, setShowQtyBox] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('مواد غذائية');
  const [expenseDate, setExpenseDate] = useState(localDateISO());
  const [person, setPerson] = useState(db.family[0] || '');
  const [shop, setShop] = useState('');
  const [payMode, setPayMode] = useState<'cash' | 'debt'>('cash');
  const [creditor, setCreditor] = useState('');
  const [due, setDue] = useState('');
  const [photo, setPhoto] = useState('');

  // Family expenses card state (directly under Confirm Expense)
  const [famPerson, setFamPerson] = useState(db.family[0] || '');
  const [famCat, setFamCat] = useState('غذاء ومأكولات');
  const [famCatOther, setFamCatOther] = useState('');
  const [famAmt, setFamAmt] = useState('');
  const [expandedFamilyPerson, setExpandedFamilyPerson] = useState<string | null>(null);

  // Market list state
  const [mktName, setMktName] = useState('');
  const [mktQty, setMktQty] = useState('1');
  const [mktUnit, setMktUnit] = useState('حبة');
  const [mktPrice, setMktPrice] = useState('');
  const [mktAutoExpense, setMktAutoExpense] = useState(true);
  const [mktBudgetInput, setMktBudgetInput] = useState(String(db.marketBudget));

  // History search
  const [historySearch, setHistorySearch] = useState('');

  const blurCls = db.privacyMode ? 'privacy-blur' : '';

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
  const groceryPct =
    db.groceryBudget > 0 ? Math.min(100, Math.round((monthExpenseTotal / db.groceryBudget) * 100)) : 0;

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return monthExpenses;
    return monthExpenses.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.shop || '').toLowerCase().includes(q) ||
        (t.person || '').toLowerCase().includes(q)
    );
  }, [monthExpenses, historySearch]);

  const marketTotal = db.marketList.reduce(
    (s, m) => s + (Number(m.price) || 0) * (Number(m.quantity) || 1),
    0
  );
  const marketPct =
    db.marketBudget > 0 ? Math.min(100, Math.round((marketTotal / db.marketBudget) * 100)) : 0;

  const mktFormTotal = Math.round((Number(mktQty) || 0) * (Number(mktPrice) || 0) * 100) / 100;

  const familyMonthGroups = useMemo(() => {
    const famTxs = db.tx.filter(
      (t) => getTxYM(t) === ym && t.type === 'out' && t.cat === 'fam'
    );
    const map = new Map<
      string,
      { person: string; total: number; items: typeof famTxs }
    >();
    for (const t of famTxs) {
      const p = (t.person || 'فرد العائلة').trim() || 'فرد العائلة';
      const entry = map.get(p) || { person: p, total: 0, items: [] };
      entry.total += Number(t.amount) || 0;
      entry.items.push(t);
      map.set(p, entry);
    }
    return Array.from(map.values());
  }, [db.tx, ym]);

  const familyGrandTotal = useMemo(
    () => familyMonthGroups.reduce((s, g) => s + g.total, 0),
    [familyMonthGroups]
  );

  const existingCreditors = useMemo(() => {
    return Array.from(new Set(db.homeDebts.map((d) => d.creditor).filter(Boolean)));
  }, [db.homeDebts]);

  const computedTotal = useMemo(() => {
    const p = Number(unitPrice) || 0;
    const q = showQtyBox ? Math.max(0.01, Number(qty) || 1) : 1;
    return Math.round(p * q);
  }, [unitPrice, qty, showQtyBox]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    setPhoto(compressed);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (computedTotal <= 0) return;
    const baseTitle =
      [...selectedItems, customTitle.trim()].filter(Boolean).join('، ') || 'مشتريات منزلية';
    const qtySuffix = showQtyBox && Number(qty) > 0 ? ` (${qty} ${unit})` : '';
    onAddExpense({
      title: `${baseTitle}${qtySuffix}`,
      amount: computedTotal,
      person: person || db.family[0] || '',
      shop: shop.trim(),
      category: expenseCategory,
      dateISO: expenseDate,
      payMode,
      creditor: creditor.trim() || shop.trim() || 'محل',
      due,
      photo,
    });
    setSelectedItems([]);
    setCustomTitle('');
    setUnitPrice('');
    setQty('1');
    setShop('');
    setCreditor('');
    setDue('');
    setPhoto('');
  };

  const formatMarketShareText = () => {
    const lines = db.marketList.map(
      (m) =>
        `${m.done ? '✅' : '⬜'} ${m.name} (${m.quantity} ${m.unit})${
          m.price > 0 ? ` — ${fmt(m.price * m.quantity)}` : ''
        }`
    );
    return `🛍️ قائمة السوق:\n${lines.join('\n')}\nالإجمالي التقديري: ${fmt(marketTotal)}`;
  };

  const handleCopyMarket = async () => {
    if (db.marketList.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatMarketShareText());
      onNotify('تم نسخ قائمة السوق بنجاح');
    } catch {
      onNotify('تعذر النسخ التلقائي');
    }
  };

  const handleShareMarket = async () => {
    if (db.marketList.length === 0) return;
    const text = formatMarketShareText();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'قائمة السوق — صندوقي', text });
        return;
      } catch {
        // Fallback to copy
      }
    }
    await handleCopyMarket();
  };

  const handleAddSelectedToMarket = () => {
    if (selectedItems.length === 0) return;
    selectedItems.forEach((name) => {
      const catItem = db.catalog.find((c) => c.name === name);
      onAddMarketItem(name, 1, catItem?.unit || suggestMarketUnit(name), catItem?.price || 0);
    });
    setSelectedItems([]);
  };

  const renderMarketListCard = () => (
    <section className="rounded-2xl border border-amber-200/80 border-t-4 border-t-amber-500 bg-white p-4 dark:border-slate-800 dark:border-t-amber-500 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            🛍️ قائمة مشتريات السوق (المشتريات المطلوبة)
          </h2>
          <p className={`tabular-nums text-xs text-slate-500 ${blurCls}`}>
            التكلفة التقديرية: {fmt(marketTotal)} من ميزانية {fmt(db.marketBudget)} ({marketPct}%)
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={handleShareMarket}
            className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
            مشاركة / واتساب
          </button>
          <button
            type="button"
            onClick={handleCopyMarket}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-700"
          >
            <Copy className="h-3.5 w-3.5" />
            نسخ
          </button>
          {db.marketList.some((m) => m.done) && (
            <button
              type="button"
              onClick={onClearDoneMarket}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              🧹 مسح المكتمل
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-all ${
            marketPct >= 100 ? 'bg-rose-600' : marketPct >= 80 ? 'bg-amber-500' : 'bg-emerald-600'
          }`}
          style={{ width: `${marketPct}%` }}
        />
      </div>

      {/* Editable Market Budget */}
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
        <span className="font-semibold">ميزانية السوق (دج):</span>
        <input
          type="number"
          min={0}
          step={100}
          value={mktBudgetInput}
          onChange={(e) => setMktBudgetInput(e.target.value)}
          className="tabular-nums w-28 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={() => onUpdateMarketBudget(Math.max(0, Number(mktBudgetInput) || 0))}
          className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-white dark:bg-emerald-700"
        >
          حفظ السقف
        </button>
      </div>

      {/* Detailed V12 Add Market Item Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!mktName.trim()) return;
          onAddMarketItem(
            mktName.trim(),
            Math.max(0.1, Number(mktQty) || 1),
            mktUnit,
            Math.max(0, Number(mktPrice) || 0)
          );
          setMktName('');
          setMktQty('1');
          setMktUnit('حبة');
          setMktPrice('');
        }}
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6"
      >
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">اسم الغرض</label>
          <input
            type="text"
            value={mktName}
            onChange={(e) => setMktName(e.target.value)}
            onBlur={() => {
              if (mktName.trim()) setMktUnit(suggestMarketUnit(mktName));
            }}
            placeholder="مثال: سكر، بطاطا، خبز"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">الكمية</label>
          <input
            type="number"
            step="0.1"
            min={0.1}
            value={mktQty}
            onChange={(e) => setMktQty(e.target.value)}
            className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">الوحدة</label>
          <select
            value={mktUnit}
            onChange={(e) => setMktUnit(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            السعر الوحدوي (دج)
          </label>
          <input
            type="number"
            min={0}
            value={mktPrice}
            onChange={(e) => setMktPrice(e.target.value)}
            placeholder="0"
            className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-slate-500">
            السعر الإجمالي (دج)
          </label>
          <input
            type="text"
            readOnly
            value={mktFormTotal > 0 ? String(mktFormTotal) : '0'}
            className="tabular-nums w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
          />
        </div>
        <button
          type="submit"
          className="col-span-2 inline-flex items-center justify-center gap-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-700 sm:col-span-6"
        >
          <Plus className="h-4 w-4" />
          ➕ أضف لقائمة مشتريات السوق
        </button>
      </form>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={mktAutoExpense}
          onChange={(e) => setMktAutoExpense(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
        />
        <span>عند تعليم الغرض كمُشترى، يُسجّل سعره تلقائياً كمصروف في الخزينة العائلية</span>
      </label>

      <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {db.marketList.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-500">
            قائمة مشتريات السوق فارغة حالياً. أضف غرضاً بالأعلى أو اختر من الكتالوج.
          </p>
        ) : (
          db.marketList.map((m) => {
            const lineTotal = (Number(m.price) || 0) * (Number(m.quantity) || 1);
            return (
              <div key={m.id} className="space-y-2 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={m.done}
                      onChange={() => onToggleMarketItem(m.id, !m.done && mktAutoExpense)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                    />
                    <span className={`text-sm font-semibold ${m.done ? 'line-through opacity-50' : ''}`}>
                      {m.name}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                      {lineTotal > 0 ? fmt(lineTotal) : 'بدون سعر'}
                    </span>
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
                <div className="flex flex-wrap items-center gap-1.5 pr-6 text-xs">
                  <input
                    type="number"
                    min={0.1}
                    step="0.1"
                    value={m.quantity || 1}
                    onChange={(e) =>
                      onUpdateMarketItem(m.id, { quantity: Math.max(0.1, Number(e.target.value) || 1) })
                    }
                    className="tabular-nums w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <select
                    value={m.unit || 'حبة'}
                    onChange={(e) => onUpdateMarketItem(m.id, { unit: e.target.value })}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="سعر الوحدة"
                    value={m.price || ''}
                    onChange={(e) =>
                      onUpdateMarketItem(m.id, { price: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="tabular-nums w-24 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <span className="text-[11px] text-slate-500">دج للوحدة</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            ['products', '🥦 المنتجات والتسجيل'],
            ['market', `🛍️ قائمة السوق (${db.marketList.length})`],
            ['history', `🕘 السجل (${monthExpenses.length})`],
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
        <div className="space-y-4">
          {/* Monthly Grocery Budget Meter */}
          {db.groceryBudget > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>🛒 سقف المصروف الشهري</span>
                <span className={`tabular-nums ${blurCls}`}>
                  {fmt(monthExpenseTotal)} / {fmt(db.groceryBudget)} ({groceryPct}%)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full transition-all ${
                    groceryPct >= 100
                      ? 'bg-rose-600'
                      : groceryPct >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                  }`}
                  style={{ width: `${groceryPct}%` }}
                />
              </div>
            </section>
          )}

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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <ShoppingBag className="h-4 w-4 text-emerald-600" />
                  <span>تسجيل مصروف / شراء بالدين</span>
                </h3>
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddSelectedToMarket}
                      className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      🛍️ أضف لقائمة السوق ({selectedItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItems([])}
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      مسح المحدد
                    </button>
                  </div>
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
                      {showQtyBox ? 'سعر الوحدة (دج)' : 'المبلغ (دج)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
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

                {/* Quantity & Unit toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowQtyBox((v) => !v)}
                    className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {showQtyBox ? '▾ إخفاء الكمية والوحدة' : '▸ تحديد الكمية والوحدة (اختياري)'}
                  </button>
                  {showQtyBox && (
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <input
                        type="number"
                        step="0.1"
                        min={0.1}
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder="الكمية"
                        className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      />
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <div className="col-span-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        الإجمالي المحسوب: {fmt(computedTotal)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      التصنيف
                    </label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                      تاريخ المصروف
                    </label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                    />
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
                        {existingCreditors.slice(0, 6).map((c) => (
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
                  {payMode === 'debt'
                    ? `تسجيل كدين (${fmt(computedTotal)})`
                    : `تأكيد المصروف (${fmt(computedTotal)})`}
                </button>
              </form>
            </section>
          </div>

          {/* Family Member Expenses Card — directly under Confirm Expense (matching V12 screenshots) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-sky-600" />
                <span>👨‍👩‍👧‍👦 مصاريف أفراد العائلة</span>
              </h2>
              <span className="rounded-lg border border-emerald-500/40 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                تنقص من الراتب
              </span>
            </div>

            {/* Member buttons */}
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="grid grid-cols-3 gap-2">
                {db.family.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFamPerson(m)}
                    className={`rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                      db.family.length === 4 && idx === 3 ? 'col-span-3' : ''
                    } ${
                      famPerson === m
                        ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm'
                        : 'border-slate-200 bg-slate-200/70 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const amt = Number(famAmt);
                const category =
                  famCat === 'أخرى' && famCatOther.trim() ? famCatOther.trim() : famCat;
                if (!famPerson || !Number.isFinite(amt) || amt <= 0) return;
                onAddFamilyExpense({ person: famPerson, category, amount: amt });
                setFamAmt('');
                setFamCatOther('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    الفرد
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={famPerson}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                    نوع المصروف
                  </label>
                  <select
                    value={famCat}
                    onChange={(e) => setFamCat(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-slate-800"
                  >
                    {FAMILY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {famCat === 'أخرى' && (
                <input
                  type="text"
                  value={famCatOther}
                  onChange={(e) => setFamCatOther(e.target.value)}
                  placeholder="اكتب نوع المصروف"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800"
                />
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  المبلغ (دج)
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={famAmt}
                  onChange={(e) => setFamAmt(e.target.value)}
                  placeholder="0"
                  className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-600"
              >
                <Wallet className="h-4 w-4" />
                تسجيل مصروف الفرد
              </button>
            </form>

            {/* Grand total box matching V12 screenshot */}
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-sky-400/50 border-r-4 border-r-sky-500 bg-sky-50/70 px-4 py-3 dark:bg-sky-950/30">
              <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                إجمالي مصاريف جميع أفراد العائلة
              </strong>
              <strong className={`tabular-nums whitespace-nowrap text-base font-extrabold text-rose-500 ${blurCls}`}>
                {fmt(familyGrandTotal)}
              </strong>
            </div>

            {/* Expandable per-member breakdown */}
            <div className="mt-3 space-y-2">
              {familyMonthGroups.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-500">
                  لا توجد مصاريف عائلية مسجلة لهذا الشهر.
                </p>
              ) : (
                familyMonthGroups.map((g) => {
                  const open = expandedFamilyPerson === g.person;
                  return (
                    <div
                      key={g.person}
                      className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFamilyPerson(open ? null : g.person)
                        }
                        className="flex w-full items-center justify-between gap-2 bg-slate-50/70 px-3 py-2.5 text-right text-xs dark:bg-slate-800/50"
                      >
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {g.person}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">
                            {g.items.length} مصروفات
                          </span>
                          <b className={`tabular-nums text-rose-600 dark:text-rose-400 ${blurCls}`}>
                            {fmt(g.total)}
                          </b>
                          {open ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </span>
                      </button>
                      {open && (
                        <div className="divide-y divide-slate-100 px-3 dark:divide-slate-800">
                          {g.items.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 py-2 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-800 dark:text-slate-200">
                                  {t.name}
                                </div>
                                <div className="text-[11px] text-slate-500">📅 {t.date}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`tabular-nums font-bold text-rose-600 ${blurCls}`}>
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
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Market Shopping List — always visible directly on Expenses page too */}
          {renderMarketListCard()}
        </div>
      )}

      {subTab === 'market' && renderMarketListCard()}

      {subTab === 'history' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              مشتريات ومصاريف هذا الشهر
            </h2>
            <span className={`tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400 ${blurCls}`}>
              {fmt(monthExpenseTotal)}
            </span>
          </div>

          <div className="relative mt-3">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="بحث في المشتريات أو المحل أو الفرد..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-9 pl-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
            {filteredHistory.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">
                لا توجد مصاريف منزلية مطابقة في هذا الشهر.
              </p>
            ) : (
              filteredHistory.map((t) => (
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
                    <span className={`tabular-nums text-sm font-bold text-rose-600 dark:text-rose-400 ${blurCls}`}>
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
