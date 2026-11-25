import React, { useMemo, useState } from 'react';
import { Check, Plus, Printer, Scissors, Trash2 } from 'lucide-react';
import { OrderStage, SandooqiDB, SewingOrder } from '../types/sandooqi';
import { fmt } from '../utils/finance';

interface TailoringViewProps {
  db: SandooqiDB;
  onAddOrder: (order: Omit<SewingOrder, 'id' | 'date' | 'ym'>) => void;
  onUpdateStage: (id: number, stage: OrderStage) => void;
  onCollectOrderPayment: (order: SewingOrder) => void;
  onDeleteOrder: (id: number) => void;
}

const STAGES: OrderStage[] = ['جديد', 'قيد التفصيل', 'جاهز', 'مسلّم'];

export const TailoringView: React.FC<TailoringViewProps> = ({
  db,
  onAddOrder,
  onUpdateStage,
  onCollectOrderPayment,
  onDeleteOrder,
}) => {
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('');
  const [meters, setMeters] = useState('3');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [filterStage, setFilterStage] = useState<'الكل' | OrderStage>('الكل');
  const [search, setSearch] = useState('');
  const [printOrder, setPrintOrder] = useState<SewingOrder | null>(null);

  const estFabricCost = Math.max(0, Number(meters) || 0) * db.meterPrice;
  const estThreadCost = db.threadPrice;

  const stats = useMemo(() => {
    const totalSales = db.orders.reduce((s, o) => s + o.price, 0);
    const totalCollected = db.orders.reduce((s, o) => s + o.paid, 0);
    const totalCosts = db.orders.reduce((s, o) => s + o.fabricCost + o.threadCost, 0);
    const remaining = Math.max(0, totalSales - totalCollected);
    return {
      totalSales,
      totalCollected,
      netProfit: totalSales - totalCosts,
      remaining,
    };
  }, [db.orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return db.orders.filter((o) => {
      if (filterStage !== 'الكل' && o.stage !== filterStage) return false;
      if (
        q &&
        !o.client.toLowerCase().includes(q) &&
        !o.model.toLowerCase().includes(q) &&
        !(o.phone || '').includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [db.orders, filterStage, search]);

  return (
    <div className="space-y-4">
      {/* Workshop Stats */}
      <section className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500">إجمالي الطلبيات</div>
          <div className="tabular-nums mt-1 text-lg font-bold">{fmt(stats.totalSales)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500">المحصّل نقداً</div>
          <div className="tabular-nums mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {fmt(stats.totalCollected)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500">المتبقي عند الزبائن</div>
          <div className="tabular-nums mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
            {fmt(stats.remaining)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs text-slate-500">صافي ربح الورشة</div>
          <div className="tabular-nums mt-1 text-lg font-bold text-violet-700 dark:text-violet-400">
            {fmt(stats.netProfit)}
          </div>
        </div>
      </section>

      {/* Add Order Form */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
          <Scissors className="h-4 w-4 text-violet-600" />
          <span>إضافة طلبية خياطة جديدة</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const pr = Number(price);
            if (!client.trim() || !model.trim() || !Number.isFinite(pr) || pr <= 0) return;
            const pd = Math.min(pr, Math.max(0, Number(paid) || 0));
            onAddOrder({
              client: client.trim(),
              phone: phone.trim(),
              model: model.trim(),
              meters: Math.max(0, Number(meters) || 0),
              price: pr,
              paid: pd,
              fabricCost: estFabricCost,
              threadCost: estThreadCost,
              stage: 'جديد',
              dueDate,
              notes: notes.trim(),
            });
            setClient('');
            setPhone('');
            setModel('');
            setPrice('');
            setPaid('');
            setDueDate('');
            setNotes('');
          }}
          className="mt-3 space-y-3"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="text"
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="اسم الزبونة / الزبون"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="رقم الهاتف (اختياري)"
              className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="الموديل / نوع اللباس"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                الأمتار (تكلفة {fmt(estFabricCost)})
              </label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={meters}
                onChange={(e) => setMeters(e.target.value)}
                className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                السعر الإجمالي (دج)
              </label>
              <input
                type="number"
                required
                min={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                العربون / المدفوع (دج)
              </label>
              <input
                type="number"
                min={0}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0"
                className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                تاريخ التسليم
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="القياسات أو ملاحظات التفصيل (اختياري)"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-5 py-2 text-sm font-bold text-white hover:bg-violet-800"
            >
              <Plus className="h-4 w-4" />
              حفظ الطلبية
            </button>
          </div>
        </form>
      </section>

      {/* Orders List */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(['الكل', ...STAGES] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStage(st)}
                className={`rounded-xl border px-3 py-1 text-xs font-bold ${
                  filterStage === st
                    ? 'border-violet-600 bg-violet-50 text-violet-800 dark:border-violet-500 dark:bg-violet-950/60 dark:text-violet-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الزبون أو الموديل..."
            className="w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">لا توجد طلبيات مطابقة.</p>
          ) : (
            filteredOrders.map((o) => {
              const rem = Math.max(0, o.price - o.paid);
              return (
                <div
                  key={o.id}
                  className="rounded-xl border border-slate-200 p-3.5 dark:border-slate-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {o.client} — <span className="text-violet-700 dark:text-violet-400">{o.model}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {o.phone ? `${o.phone} · ` : ''}
                        {o.meters}م · التسليم: {o.dueDate || 'غير محدد'}
                      </div>
                      {o.notes && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{o.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={o.stage}
                        onChange={(e) => onUpdateStage(o.id, e.target.value as OrderStage)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setPrintOrder(o)}
                        title="معاينة الوصل للطباعة"
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrder(o.id)}
                        aria-label="حذف"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs dark:bg-slate-800/50">
                    <div>
                      <div className="text-slate-500">السعر</div>
                      <strong className="tabular-nums">{fmt(o.price)}</strong>
                    </div>
                    <div>
                      <div className="text-slate-500">المدفوع</div>
                      <strong className="tabular-nums text-emerald-700 dark:text-emerald-400">
                        {fmt(o.paid)}
                      </strong>
                    </div>
                    <div>
                      <div className="text-slate-500">المتبقي</div>
                      <strong
                        className={`tabular-nums ${
                          rem > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {rem > 0 ? fmt(rem) : 'خالص'}
                      </strong>
                    </div>
                  </div>

                  {rem > 0 && (
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onCollectOrderPayment(o)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        تحصيل دفعة لحساب الخياطة
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Printable In-App Receipt Modal */}
      {printOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="print-only-sheet w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
            <h3 className="text-center text-lg font-bold">وصل طلبية خياطة — صندوقي</h3>
            <div className="mt-4 divide-y divide-slate-200 text-sm">
              <div className="flex justify-between py-2">
                <span>الزبون:</span>
                <strong>{printOrder.client}</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>الموديل:</span>
                <strong>{printOrder.model}</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>السعر الإجمالي:</span>
                <strong className="tabular-nums">{fmt(printOrder.price)}</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>المدفوع:</span>
                <strong className="tabular-nums">{fmt(printOrder.paid)}</strong>
              </div>
              <div className="flex justify-between py-2">
                <span>المتبقي:</span>
                <strong className="tabular-nums">
                  {fmt(Math.max(0, printOrder.price - printOrder.paid))}
                </strong>
              </div>
              <div className="flex justify-between py-2">
                <span>تاريخ التسليم:</span>
                <strong>{printOrder.dueDate || '—'}</strong>
              </div>
            </div>
            <div className="no-print mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
              >
                إغلاق
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
              >
                <Printer className="h-3.5 w-3.5" />
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
