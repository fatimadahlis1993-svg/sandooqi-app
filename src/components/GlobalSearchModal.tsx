import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { AppPage, SandooqiDB } from '../types/sandooqi';
import { debtRemaining, fmt } from '../utils/finance';

interface GlobalSearchModalProps {
  open: boolean;
  db: SandooqiDB;
  onClose: () => void;
  onNavigate: (page: AppPage) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  open,
  db,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const results: { title: string; sub: string; amount?: string; page: AppPage }[] = [];

    for (const t of db.tx) {
      if (
        t.name.toLowerCase().includes(q) ||
        (t.person && t.person.toLowerCase().includes(q)) ||
        String(t.amount).includes(q)
      ) {
        results.push({
          title: t.name,
          sub: `معاملة · ${t.date}`,
          amount: fmt(t.amount),
          page: t.box === 'home' ? 'expenses' : 'treasury',
        });
      }
      if (results.length >= 25) break;
    }

    for (const d of db.homeDebts) {
      if (
        d.creditor.toLowerCase().includes(q) ||
        d.item.toLowerCase().includes(q) ||
        String(d.amount).includes(q)
      ) {
        results.push({
          title: `${d.creditor} — ${d.item}`,
          sub: `دين محل · المتبقي ${fmt(debtRemaining(d))}`,
          amount: fmt(d.amount),
          page: 'bills',
        });
      }
    }

    for (const o of db.orders) {
      if (o.client.toLowerCase().includes(q) || o.model.toLowerCase().includes(q)) {
        results.push({
          title: `${o.client} — ${o.model}`,
          sub: `طلبية خياطة · ${o.stage}`,
          amount: fmt(o.price),
          page: 'tailoring',
        });
      }
    }

    for (const w of db.warranties) {
      if (
        w.deviceName.toLowerCase().includes(q) ||
        w.shopOrBrand.toLowerCase().includes(q)
      ) {
        results.push({
          title: w.deviceName,
          sub: `ضمان · ينتهي ${w.warrantyEndDateIso || '—'}`,
          amount: w.cost > 0 ? fmt(w.cost) : undefined,
          page: 'tools',
        });
      }
    }

    return results.slice(0, 20);
  }, [db, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-16">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، المحل، الطلبية، الضمان أو المبلغ..."
            className="flex-1 bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto p-2 dark:divide-slate-800">
          {!query.trim() ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              اكتب كلمة أو مبلغاً للبحث الفوري في جميع أقسام صندوقي
            </p>
          ) : hits.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              لا توجد نتائج مطابقة
            </p>
          ) : (
            hits.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onNavigate(h.page);
                  onClose();
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {h.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{h.sub}</div>
                </div>
                {h.amount && (
                  <span className="tabular-nums shrink-0 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {h.amount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
