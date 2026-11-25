import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Package,
  Plus,
  Printer,
  Ruler,
  Scissors,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import {
  MeasurementRecord,
  OrderFabricLine,
  OrderMeasurements,
  OrderStage,
  OrderSupplyLine,
  SandooqiDB,
  SewDebtRecord,
  SewMaterial,
  SewingOrder,
  SewProjectRecord,
  SewServiceRecord,
} from '../types/sandooqi';
import { currentYM, daysUntil, fmt, formatYM, localDateISO } from '../utils/finance';
import { compressImageFile } from '../utils/storage';

interface TailoringViewProps {
  db: SandooqiDB;
  onAddOrder: (
    order: Omit<SewingOrder, 'id' | 'date' | 'ym'>,
    stockDeductions: { stockId: number; qty: number }[]
  ) => void;
  onUpdateStage: (id: number, stage: OrderStage) => void;
  onCollectOrderPayment: (order: SewingOrder) => void;
  onDeleteOrder: (id: number) => void;
  onPreviewPhoto: (src: string, title: string) => void;
  // Measurements
  onAddMeasurement: (m: Omit<MeasurementRecord, 'id' | 'date'>) => void;
  onDeleteMeasurement: (id: number) => void;
  // Services
  onAddSewService: (s: Omit<SewServiceRecord, 'id' | 'date' | 'ym'>) => void;
  onDeleteSewService: (id: number) => void;
  // Materials Inventory
  onAddSewMaterial: (m: Omit<SewMaterial, 'id' | 'date'>) => void;
  onUseSewMaterial: (m: SewMaterial) => void;
  onDeleteSewMaterial: (id: number) => void;
  // Own Projects
  onAddSewProject: (p: Omit<SewProjectRecord, 'id' | 'date' | 'ym'>) => void;
  onDeleteSewProject: (id: number) => void;
  // Sewing Finance Movements & Debts
  onSewCashMovement: (type: 'in' | 'out', name: string, amount: number) => void;
  onTransferSewingToFamily: (amount: number) => void;
  onAddSewDebt: (d: Omit<SewDebtRecord, 'id' | 'paid' | 'date' | 'ym'>) => void;
  onPaySewDebt: (d: SewDebtRecord) => void;
  onDeleteSewDebt: (id: number) => void;
}

const STAGES: OrderStage[] = ['جديد', 'قيد التفصيل', 'جاهز', 'مسلّم'];
type SewTab = 'orders' | 'calendar' | 'clients' | 'workshop' | 'finance';

const SUPPLY_OPTIONS = [
  'خيط',
  'سحاب',
  'أزرار',
  'دانتيل',
  'طرز',
  'بطانة',
  'مطاط',
  'إبرة',
  'لوازم أخرى',
];

export const TailoringView: React.FC<TailoringViewProps> = ({
  db,
  onAddOrder,
  onUpdateStage,
  onCollectOrderPayment,
  onDeleteOrder,
  onPreviewPhoto,
  onAddMeasurement,
  onDeleteMeasurement,
  onAddSewService,
  onDeleteSewService,
  onAddSewMaterial,
  onUseSewMaterial,
  onDeleteSewMaterial,
  onAddSewProject,
  onDeleteSewProject,
  onSewCashMovement,
  onTransferSewingToFamily,
  onAddSewDebt,
  onPaySewDebt,
  onDeleteSewDebt,
}) => {
  const [sewTab, setSewTab] = useState<SewTab>('orders');
  const [showOrderForm, setShowOrderForm] = useState(false);

  // Order Form State
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [model, setModel] = useState('');
  const [photo, setPhoto] = useState('');
  const [fittingDate, setFittingDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [meterRate, setMeterRate] = useState(String(db.meterPrice || 300));
  const [flatLabor, setFlatLabor] = useState('0');
  const [adjustment, setAdjustment] = useState('0');
  const [paid, setPaid] = useState('0');
  const [notes, setNotes] = useState('');

  // Order Fabrics Draft
  const [fabrics, setFabrics] = useState<OrderFabricLine[]>([]);
  const [fabSource, setFabSource] = useState<'customer' | 'workshop'>('customer');
  const [fabName, setFabName] = useState('');
  const [fabMeters, setFabMeters] = useState('');
  const [fabRate, setFabRate] = useState('');
  const [fabBuyRate, setFabBuyRate] = useState('');

  // Order Supplies Draft
  const [supplies, setSupplies] = useState<OrderSupplyLine[]>([]);
  const [supName, setSupName] = useState('خيط');
  const [supCustom, setSupCustom] = useState('');
  const [supCost, setSupCost] = useState('');
  const [stockPickId, setStockPickId] = useState('');
  const [stockPickQty, setStockPickQty] = useState('1');

  // Order Measurements Draft
  const [ordMeas, setOrdMeas] = useState<OrderMeasurements>({});

  // Pricing Estimator
  const [estMat, setEstMat] = useState('0');
  const [estHours, setEstHours] = useState('0');
  const [estHourlyRate, setEstHourlyRate] = useState('0');
  const [estExtra, setEstExtra] = useState('0');
  const [estProfitPct, setEstProfitPct] = useState('25');

  // Order List Filters
  const [filterStage, setFilterStage] = useState<'الكل' | 'متأخرة' | OrderStage>('الكل');
  const [sortBy, setSortBy] = useState<'due' | 'new'>('new');
  const [search, setSearch] = useState('');
  const [printOrder, setPrintOrder] = useState<SewingOrder | null>(null);

  // Calendar Week Offset
  const [weekOffset, setWeekOffset] = useState(0);

  // Clients & Measurements
  const [measName, setMeasName] = useState('');
  const [measPhone, setMeasPhone] = useState('');
  const [measLen, setMeasLen] = useState('');
  const [measSh, setMeasSh] = useState('');
  const [measChest, setMeasChest] = useState('');
  const [measWaist, setMeasWaist] = useState('');
  const [measHip, setMeasHip] = useState('');
  const [measSleeve, setMeasSleeve] = useState('');
  const [measNote, setMeasNote] = useState('');
  const [measSearch, setMeasSearch] = useState('');

  // Customer Service Form
  const [svcClient, setSvcClient] = useState('');
  const [svcItem, setSvcItem] = useState('');
  const [svcMeters, setSvcMeters] = useState('');
  const [svcRate, setSvcRate] = useState(String(db.meterPrice || 300));
  const [svcThread, setSvcThread] = useState('');
  const [svcSupplies, setSvcSupplies] = useState('');
  const [svcPaid, setSvcPaid] = useState('');

  // Workshop Inventory Form
  const [matName, setMatName] = useState('');
  const [matUnit, setMatUnit] = useState('قطعة');
  const [matQty, setMatQty] = useState('');
  const [matCost, setMatCost] = useState('');
  const [matMin, setMatMin] = useState('2');

  // Own Project Form
  const [prjName, setPrjName] = useState('');
  const [prjMeters, setPrjMeters] = useState('');
  const [prjFabRate, setPrjFabRate] = useState('');
  const [prjSupplies, setPrjSupplies] = useState('');
  const [prjOther, setPrjOther] = useState('');
  const [prjSale, setPrjSale] = useState('');
  const [prjPaid, setPrjPaid] = useState('');
  const [prjStatus, setPrjStatus] = useState<'work' | 'ready' | 'sold'>('work');

  // Finance Movements & Debts
  const [repMonth, setRepMonth] = useState(currentYM());
  const [meterInCnt, setMeterInCnt] = useState('1');
  const [meterInPrice, setMeterInPrice] = useState(String(db.meterPrice || 300));
  const [meterInNote, setMeterInNote] = useState('');
  const [threadCnt, setThreadCnt] = useState('1');
  const [threadUnitCost, setThreadUnitCost] = useState(String(db.threadPrice || 100));
  const [manualSewName, setManualSewName] = useState('');
  const [manualSewAmt, setManualSewAmt] = useState('');
  const [trHomeAmt, setTrHomeAmt] = useState('');

  const [debtType, setDebtType] = useState<'in' | 'out'>('in');
  const [debtName, setDebtName] = useState('');
  const [debtAmt, setDebtAmt] = useState('');
  const [debtDue, setDebtDue] = useState('');

  const blurCls = db.privacyMode ? 'privacy-blur' : '';

  // Live Order Calculations
  const totalMeters = fabrics.reduce((s, f) => s + f.meters, 0);
  const parsedRate = Math.max(0, Number(meterRate) || 0);
  const computedLabor =
    totalMeters > 0 ? totalMeters * parsedRate : Math.max(0, Number(flatLabor) || 0);
  const fabricsCharge = fabrics.reduce((s, f) => s + f.charge, 0);
  const fabricsCost = fabrics.reduce((s, f) => s + f.cost, 0);
  const suppliesCost = supplies.reduce((s, x) => s + x.cost, 0);
  const parsedAdj = Number(adjustment) || 0;
  const orderGrandTotal = Math.max(
    0,
    computedLabor + fabricsCharge + suppliesCost + parsedAdj
  );
  const parsedDeposit = Math.min(orderGrandTotal, Math.max(0, Number(paid) || 0));

  // Estimator Math
  const estMaterialsVal =
    suppliesCost > 0 ? suppliesCost : Math.max(0, Number(estMat) || 0);
  const estLaborVal =
    Math.max(0, Number(estHours) || 0) * Math.max(0, Number(estHourlyRate) || 0);
  const estExtraVal = Math.max(0, Number(estExtra) || 0);
  const estBaseCost = estMaterialsVal + estLaborVal + estExtraVal;
  const estSuggested = Math.round(
    estBaseCost * (1 + Math.max(0, Number(estProfitPct) || 0) / 100)
  );

  // Dashboard Stats
  const stats = useMemo(() => {
    const totalSales = db.orders.reduce((s, o) => s + o.price, 0);
    const totalCollected = db.orders.reduce((s, o) => s + o.paid, 0);
    const totalCosts = db.orders.reduce((s, o) => s + o.fabricCost + o.threadCost, 0);
    const remaining = Math.max(0, totalSales - totalCollected);
    return {
      totalSales,
      totalCollected,
      totalCosts,
      netProfit: totalSales - totalCosts,
      realizedProfit: totalCollected - totalCosts,
      remaining,
    };
  }, [db.orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = db.orders.filter((o) => {
      if (filterStage === 'متأخرة') {
        const du = daysUntil(o.dueDate);
        if (o.stage === 'مسلّم' || du === null || du >= 0) return false;
      } else if (filterStage !== 'الكل' && o.stage !== filterStage) {
        return false;
      }
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
    if (sortBy === 'due') {
      return [...list].sort((a, b) =>
        (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31')
      );
    }
    return list;
  }, [db.orders, filterStage, search, sortBy]);

  // Weekly Schedule Days
  const weekDays = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay(); // 0 Sun .. 6 Sat
    const diffToSat = (day + 1) % 7;
    start.setDate(start.getDate() - diffToSat + weekOffset * 7);
    const names = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = localDateISO(d);
      const events = db.orders.filter(
        (o) => o.stage !== 'مسلّم' && (o.dueDate === iso || o.fittingDate === iso)
      );
      return { iso, label: names[i], events };
    });
  }, [db.orders, weekOffset]);

  const dueSoonOrders = useMemo(() => {
    return db.orders.filter((o) => {
      if (o.stage === 'مسلّم') return false;
      const du = daysUntil(o.dueDate);
      return du !== null && du <= 3;
    });
  }, [db.orders]);

  // Unified Customer List
  const customerProfiles = useMemo(() => {
    const map = new Map<string, { name: string; orders: number; total: number; meas: number }>();
    for (const o of db.orders) {
      const k = o.client.trim();
      const cur = map.get(k) || { name: k, orders: 0, total: 0, meas: 0 };
      cur.orders += 1;
      cur.total += o.price;
      map.set(k, cur);
    }
    for (const m of db.measurements || []) {
      const k = m.name.trim();
      const cur = map.get(k) || { name: k, orders: 0, total: 0, meas: 0 };
      cur.meas += 1;
      map.set(k, cur);
    }
    return Array.from(map.values());
  }, [db.orders, db.measurements]);

  // Monthly Sewing Report
  const monthlyStats = useMemo(() => {
    const rows = db.orders.filter((o) => o.ym === repMonth);
    const sales = rows.reduce((s, o) => s + o.price, 0);
    const collected = rows.reduce((s, o) => s + o.paid, 0);
    const costs = rows.reduce((s, o) => s + o.fabricCost + o.threadCost, 0);
    return { count: rows.length, sales, collected, costs, profit: sales - costs };
  }, [db.orders, repMonth]);

  const handleOrderPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImageFile(f);
    setPhoto(compressed);
  };

  const handleAddFabric = () => {
    const m = Number(fabMeters);
    if (!fabName.trim() || !Number.isFinite(m) || m <= 0) return;
    const buy = fabSource === 'workshop' ? Math.max(0, Number(fabBuyRate) || 0) : 0;
    const sellRate =
      fabRate.trim() !== '' ? Math.max(0, Number(fabRate) || 0) : fabSource === 'workshop' ? buy : 0;
    const charge = fabSource === 'workshop' ? Number((m * sellRate).toFixed(2)) : 0;
    const cost = fabSource === 'workshop' ? Number((m * buy).toFixed(2)) : 0;
    setFabrics((prev) => [
      ...prev,
      {
        id: `fab_${Date.now()}_${Math.random()}`,
        name: fabName.trim(),
        source: fabSource,
        meters: m,
        rate: sellRate,
        buyRate: buy,
        charge,
        cost,
      },
    ]);
    setFabName('');
    setFabMeters('');
    setFabRate('');
    setFabBuyRate('');
  };

  const handleAddSupply = () => {
    const name = supName === '__custom' ? supCustom.trim() : supName;
    const cost = Math.max(0, Number(supCost) || 0);
    if (!name) return;
    setSupplies((prev) => [
      ...prev,
      { id: `sup_${Date.now()}_${Math.random()}`, name, cost },
    ]);
    setSupCustom('');
    setSupCost('');
  };

  const handleAddStockToOrder = () => {
    const mat = (db.sewMaterials || []).find((m) => String(m.id) === stockPickId);
    const qty = Math.max(0.01, Number(stockPickQty) || 0);
    if (!mat || qty <= 0 || qty > mat.qty) return;
    setSupplies((prev) => [
      ...prev,
      {
        id: `stk_${Date.now()}_${Math.random()}`,
        name: mat.name,
        cost: Number((qty * mat.cost).toFixed(2)),
        stockId: mat.id,
        qty,
        unit: mat.unit,
      },
    ]);
    setStockPickId('');
    setStockPickQty('1');
  };

  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim() || !model.trim() || orderGrandTotal <= 0) return;
    const stockDeductions = supplies
      .filter((s) => s.stockId && s.qty)
      .map((s) => ({ stockId: s.stockId!, qty: s.qty! }));

    onAddOrder(
      {
        client: client.trim(),
        phone: phone.trim() || undefined,
        model: model.trim(),
        meters: totalMeters,
        meterRate: parsedRate,
        flatLabor: totalMeters > 0 ? 0 : Math.max(0, Number(flatLabor) || 0),
        adjustment: parsedAdj,
        price: orderGrandTotal,
        paid: parsedDeposit,
        fabricCost: fabricsCost,
        threadCost: suppliesCost,
        stage: 'جديد',
        fittingDate: fittingDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        photo: photo || undefined,
        fabrics: fabrics.length ? fabrics : undefined,
        supplies: supplies.length ? supplies : undefined,
        measurements: Object.values(ordMeas).some(Boolean) ? ordMeas : undefined,
      },
      stockDeductions
    );

    setClient('');
    setPhone('');
    setModel('');
    setPhoto('');
    setFittingDate('');
    setDueDate('');
    setFlatLabor('0');
    setAdjustment('0');
    setPaid('0');
    setNotes('');
    setFabrics([]);
    setSupplies([]);
    setOrdMeas({});
    setShowOrderForm(false);
  };

  const svcPrice = Math.max(0, Number(svcMeters) || 0) * Math.max(0, Number(svcRate) || 0);
  const svcProfit =
    svcPrice - (Math.max(0, Number(svcThread) || 0) + Math.max(0, Number(svcSupplies) || 0));

  const prjFabricTotal =
    Math.max(0, Number(prjMeters) || 0) * Math.max(0, Number(prjFabRate) || 0);
  const prjTotalCost =
    prjFabricTotal + (Math.max(0, Number(prjSupplies) || 0) + Math.max(0, Number(prjOther) || 0));
  const prjExpectedProfit = Math.max(0, Number(prjSale) || 0) - prjTotalCost;

  return (
    <div className="space-y-4">
      {/* 5-Tab Workshop Navigation */}
      <div className="no-print grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 dark:border-slate-800 dark:bg-slate-900">
        {(
          [
            ['orders', 'الطلبيات', Scissors],
            ['calendar', 'المواعيد', Calendar],
            ['clients', 'الزبائن', Users],
            ['workshop', 'الورشة', Package],
            ['finance', 'المالية', Wallet],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSewTab(id)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition-colors sm:flex-row sm:text-xs ${
              sewTab === id
                ? 'bg-violet-700 text-white'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ================= TAB 1: ORDERS ================= */}
      {sewTab === 'orders' && (
        <div className="space-y-4">
          {/* Quick KPIs */}
          <section className="no-print grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs text-slate-500">إجمالي الطلبيات</div>
              <div className={`tabular-nums mt-1 text-lg font-bold ${blurCls}`}>
                {fmt(stats.totalSales)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs text-slate-500">المحصّل نقداً</div>
              <div className={`tabular-nums mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                {fmt(stats.totalCollected)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs text-slate-500">المتبقي عند الزبائن</div>
              <div className={`tabular-nums mt-1 text-lg font-bold text-amber-600 dark:text-amber-400 ${blurCls}`}>
                {fmt(stats.remaining)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs text-slate-500">صافي ربح الورشة</div>
              <div className={`tabular-nums mt-1 text-lg font-bold text-violet-700 dark:text-violet-400 ${blurCls}`}>
                {fmt(stats.netProfit)}
              </div>
            </div>
          </section>

          {/* Header & Add Order Toggle */}
          <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  دفتر الطلبيات ({db.orders.filter((o) => o.stage !== 'مسلّم').length} جارية)
                </h2>
                <p className="text-xs text-slate-500">
                  أضيفي طلبيات كاملة بالأقمشة واللوازم والمقاسات وحاسبة التسعير
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOrderForm((p) => !p)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800"
              >
                <Plus className="h-4 w-4" />
                <span>{showOrderForm ? 'العودة إلى دفتر الطلبيات' : 'طلبية جديدة مفصّلة'}</span>
              </button>
            </div>

            {showOrderForm && (
              <form onSubmit={handleSaveOrder} className="mt-4 space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                {/* 1. Customer & Dates */}
                <div className="space-y-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <div className="text-xs font-bold text-violet-700 dark:text-violet-400">
                    1. الزبونة والمواعيد
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      required
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      placeholder="اسم الزبونة *"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="نوع اللباس / الموديل *"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="رقم الهاتف (اختياري)"
                      className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        موعد التجربة (اختياري)
                      </label>
                      <input
                        type="date"
                        value={fittingDate}
                        onChange={(e) => setFittingDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                        موعد التسليم
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                        <span>{photo ? 'تم إرفاق صورة الموديل ✓' : 'صورة الموديل (اختياري)'}</span>
                        <input type="file" accept="image/*" onChange={handleOrderPhoto} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Fabrics */}
                <details open className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-400">
                    2. أقمشة الطلبية ({fabrics.length}) — {totalMeters} متر
                  </summary>
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select
                        value={fabSource}
                        onChange={(e) => setFabSource(e.target.value as 'customer' | 'workshop')}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="customer">من عند الزبونة — معلومة فقط</option>
                        <option value="workshop">من عند الخياط — يُحتسب في الفاتورة</option>
                      </select>
                      <input
                        type="text"
                        value={fabName}
                        onChange={(e) => setFabName(e.target.value)}
                        placeholder="نوع القماش (كريب، قطيفة...)"
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={fabMeters}
                        onChange={(e) => setFabMeters(e.target.value)}
                        placeholder="الأمتار"
                        className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                      <input
                        type="number"
                        min={0}
                        value={fabRate}
                        onChange={(e) => setFabRate(e.target.value)}
                        placeholder={fabSource === 'workshop' ? 'سعر البيع/م' : 'قيمة المتر (اختياري)'}
                        className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                      />
                      {fabSource === 'workshop' && (
                        <input
                          type="number"
                          min={0}
                          value={fabBuyRate}
                          onChange={(e) => setFabBuyRate(e.target.value)}
                          placeholder="سعر الشراء/م"
                          className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                      <button
                        type="button"
                        onClick={handleAddFabric}
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        + إضافة القماش
                      </button>
                    </div>
                    {fabrics.length > 0 && (
                      <div className="space-y-1.5">
                        {fabrics.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800"
                          >
                            <span>
                              {f.name} · {f.meters}م ({f.source === 'customer' ? 'زبونة' : `ورشة: ${fmt(f.charge)}`})
                            </span>
                            <button
                              type="button"
                              onClick={() => setFabrics((p) => p.filter((x) => x.id !== f.id))}
                              className="text-rose-600"
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

                {/* 3. Supplies & Stock */}
                <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-400">
                    3. اللوازم ومخزون الورشة ({supplies.length}) — {fmt(suppliesCost)}
                  </summary>
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <select
                        value={supName}
                        onChange={(e) => setSupName(e.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                      >
                        {SUPPLY_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                        <option value="__custom">إضافة مادة جديدة...</option>
                      </select>
                      {supName === '__custom' && (
                        <input
                          type="text"
                          value={supCustom}
                          onChange={(e) => setSupCustom(e.target.value)}
                          placeholder="اسم المادة الجديدة"
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                      <input
                        type="number"
                        min={0}
                        value={supCost}
                        onChange={(e) => setSupCost(e.target.value)}
                        placeholder="التكلفة (دج)"
                        className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddSupply}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700"
                      >
                        + إضافة للاستهلاك
                      </button>
                    </div>

                    {(db.sewMaterials || []).some((m) => m.qty > 0) && (
                      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                        <select
                          value={stockPickId}
                          onChange={(e) => setStockPickId(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                        >
                          <option value="">سحب من مخزون الورشة...</option>
                          {db.sewMaterials
                            .filter((m) => m.qty > 0)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} (متوفر: {m.qty} {m.unit})
                              </option>
                            ))}
                        </select>
                        <input
                          type="number"
                          min={0.1}
                          step="0.1"
                          value={stockPickQty}
                          onChange={(e) => setStockPickQty(e.target.value)}
                          className="tabular-nums w-20 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddStockToOrder}
                          className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          سحب من المخزون
                        </button>
                      </div>
                    )}

                    {supplies.length > 0 && (
                      <div className="space-y-1">
                        {supplies.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-800"
                          >
                            <span>
                              {s.name} {s.qty ? `(${s.qty} ${s.unit})` : ''} — {fmt(s.cost)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSupplies((p) => p.filter((x) => x.id !== s.id))}
                              className="text-rose-600"
                            >
                              حذف
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>

                {/* 4. Measurements */}
                <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-400">
                    4. مقاسات الطلبية (اختياري)
                  </summary>
                  <div className="mt-3 space-y-2">
                    {(db.measurements || []).length > 0 && (
                      <select
                        onChange={(e) => {
                          const found = db.measurements.find((m) => String(m.id) === e.target.value);
                          if (found) {
                            setOrdMeas({
                              len: found.len,
                              sh: found.sh,
                              chest: found.chest,
                              waist: found.waist,
                              hip: found.hip,
                              sleeve: found.sleeve,
                              note: found.note,
                            });
                          }
                        }}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                      >
                        <option value="">نسخ من دفتر مقاسات الزبونات...</option>
                        {db.measurements.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.date})
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {(
                        [
                          ['len', 'الطول'],
                          ['sh', 'الكتف'],
                          ['chest', 'الصدر'],
                          ['waist', 'الخصر'],
                          ['hip', 'الأرداف'],
                          ['sleeve', 'الكم'],
                        ] as const
                      ).map(([k, lbl]) => (
                        <input
                          key={k}
                          type="text"
                          value={ordMeas[k] || ''}
                          onChange={(e) => setOrdMeas((p) => ({ ...p, [k]: e.target.value }))}
                          placeholder={lbl}
                          className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                        />
                      ))}
                    </div>
                  </div>
                </details>

                {/* 5. Pricing Calculator */}
                <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <summary className="cursor-pointer text-xs font-bold text-violet-700 dark:text-violet-400">
                    5. حاسبة التسعير الذكية
                  </summary>
                  <div className="mt-3 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">تقدير المواد</label>
                        <input
                          type="number"
                          min={0}
                          value={estMat}
                          onChange={(e) => setEstMat(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">ساعات العمل</label>
                        <input
                          type="number"
                          min={0}
                          value={estHours}
                          onChange={(e) => setEstHours(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">أجرة الساعة</label>
                        <input
                          type="number"
                          min={0}
                          value={estHourlyRate}
                          onChange={(e) => setEstHourlyRate(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">طرز وخدمات</label>
                        <input
                          type="number"
                          min={0}
                          value={estExtra}
                          onChange={(e) => setEstExtra(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] text-slate-500">الربح (%)</label>
                        <input
                          type="number"
                          min={0}
                          value={estProfitPct}
                          onChange={(e) => setEstProfitPct(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900 dark:bg-violet-950/30 dark:text-violet-200">
                      <span>السعر المقترح للزبونة: {fmt(estSuggested)} (التكلفة {fmt(estBaseCost)})</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (totalMeters === 0) {
                            setFlatLabor(String(estSuggested - suppliesCost - fabricsCharge));
                          } else {
                            setAdjustment(
                              String(estSuggested - (computedLabor + fabricsCharge + suppliesCost))
                            );
                          }
                        }}
                        className="rounded-lg bg-violet-700 px-3 py-1 text-white"
                      >
                        اعتماد السعر للطلبية
                      </button>
                    </div>
                  </div>
                </details>

                {/* 6. Final Price & Deposit */}
                <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-900/50 dark:bg-violet-950/20">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        أجرة خياطة المتر (دج)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={meterRate}
                        onChange={(e) => setMeterRate(e.target.value)}
                        className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    {totalMeters === 0 && (
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          أتعاب مقطوعة (دج)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={flatLabor}
                          onChange={(e) => setFlatLabor(e.target.value)}
                          className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                        />
                      </div>
                    )}
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        تعديل السعر (± دج)
                      </label>
                      <input
                        type="number"
                        value={adjustment}
                        onChange={(e) => setAdjustment(e.target.value)}
                        className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        العربون المدفوع (دج)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={paid}
                        onChange={(e) => setPaid(e.target.value)}
                        className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات عامة للطلبية..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                    <span>
                      الإجمالي: {fmt(orderGrandTotal)} · الباقي على الزبونة:{' '}
                      <span className="text-amber-700 dark:text-amber-400">
                        {fmt(Math.max(0, orderGrandTotal - parsedDeposit))}
                      </span>
                    </span>
                    <button
                      type="submit"
                      className="rounded-xl bg-violet-700 px-5 py-2 text-sm font-bold text-white hover:bg-violet-800"
                    >
                      حفظ الطلبية وعرض الحساب
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          {/* Orders List */}
          <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {(['الكل', ...STAGES, 'متأخرة'] as const).map((st) => (
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
              <div className="flex flex-wrap gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'due' | 'new')}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="new">الأحدث أولاً</option>
                  <option value="due">الأقرب للتسليم</option>
                </select>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالزبونة أو الموديل..."
                  className="w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">لا توجد طلبيات مطابقة.</p>
              ) : (
                filteredOrders.map((o) => {
                  const rem = Math.max(0, o.price - o.paid);
                  const du = daysUntil(o.dueDate);
                  const isLate = o.stage !== 'مسلّم' && du !== null && du < 0;
                  const stagePct =
                    o.stage === 'مسلّم'
                      ? 100
                      : o.stage === 'جاهز'
                        ? 80
                        : o.stage === 'قيد التفصيل'
                          ? 45
                          : 15;
                  return (
                    <div
                      key={o.id}
                      className={`rounded-xl border p-3.5 ${
                        isLate
                          ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            {o.client} —{' '}
                            <span className="text-violet-700 dark:text-violet-400">{o.model}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {o.phone ? `${o.phone} · ` : ''}
                            {o.meters}م · التسليم: {o.dueDate || 'غير محدد'}
                            {o.fittingDate ? ` · التجربة: ${o.fittingDate}` : ''}
                            {isLate && (
                              <span className="mr-1 font-bold text-rose-600">
                                (متأخرة {Math.abs(du!)} يوم)
                              </span>
                            )}
                          </div>
                          {o.notes && (
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                              {o.notes}
                            </p>
                          )}
                          {o.photo && (
                            <button
                              type="button"
                              onClick={() => onPreviewPhoto(o.photo!, `${o.client} — ${o.model}`)}
                              className="mt-1 text-xs font-semibold text-violet-700 underline dark:text-violet-400"
                            >
                              عرض صورة الموديل
                            </button>
                          )}
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

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full bg-emerald-600" style={{ width: `${stagePct}%` }} />
                      </div>

                      <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs dark:bg-slate-800/50">
                        <div>
                          <div className="text-slate-500">السعر</div>
                          <strong className={`tabular-nums ${blurCls}`}>{fmt(o.price)}</strong>
                        </div>
                        <div>
                          <div className="text-slate-500">المدفوع</div>
                          <strong className={`tabular-nums text-emerald-700 dark:text-emerald-400 ${blurCls}`}>
                            {fmt(o.paid)}
                          </strong>
                        </div>
                        <div>
                          <div className="text-slate-500">المتبقي</div>
                          <strong className={`tabular-nums ${rem > 0 ? 'text-amber-600' : 'text-emerald-600'} ${blurCls}`}>
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
        </div>
      )}

      {/* ================= TAB 2: CALENDAR ================= */}
      {sewTab === 'calendar' && (
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">مواعيد الخياطة الأسبوعية</h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                >
                  الأسبوع السابق
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="rounded-xl bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
                >
                  هذا الأسبوع
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                >
                  الأسبوع التالي
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {weekDays.map((d) => (
                <div
                  key={d.iso}
                  className="rounded-xl border border-slate-200 p-3 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>
                      {d.label} ({d.iso})
                    </span>
                    <span className="text-slate-500">{d.events.length} موعد</span>
                  </div>
                  {d.events.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {d.events.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs dark:bg-violet-950/30"
                        >
                          <span className="font-semibold">
                            {ev.client} — {ev.model}
                          </span>
                          <span className="text-[11px] text-violet-700 dark:text-violet-300">
                            {ev.fittingDate === d.iso ? 'تجربة' : 'تسليم'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <span>متابعة مواعيد التسليم القريبة والمتأخرة ({dueSoonOrders.length})</span>
            </h3>
            <div className="mt-3 space-y-2">
              {dueSoonOrders.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  لا توجد طلبيات مستحقة خلال الأيام الثلاثة القادمة.
                </p>
              ) : (
                dueSoonOrders.map((o) => {
                  const du = daysUntil(o.dueDate)!;
                  return (
                    <div
                      key={o.id}
                      className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs dark:border-rose-900 dark:bg-rose-950/20"
                    >
                      <div>
                        <strong>
                          {o.client} — {o.model}
                        </strong>
                        <div className="text-slate-500">
                          {o.dueDate} · {o.stage}
                        </div>
                      </div>
                      <span className="font-bold text-rose-600">
                        {du < 0 ? `متأخرة ${Math.abs(du)} يوم` : du === 0 ? 'اليوم' : `بعد ${du} يوم`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 3: CLIENTS & MEASUREMENTS ================= */}
      {sewTab === 'clients' && (
        <div className="space-y-4">
          {/* Measurements Notebook */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <Ruler className="h-4 w-4 text-violet-600" />
              <span>دفتر مقاسات الزبونات ({(db.measurements || []).length})</span>
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!measName.trim()) return;
                onAddMeasurement({
                  name: measName.trim(),
                  phone: measPhone.trim() || undefined,
                  len: measLen,
                  sh: measSh,
                  chest: measChest,
                  waist: measWaist,
                  hip: measHip,
                  sleeve: measSleeve,
                  note: measNote,
                });
                setMeasName('');
                setMeasPhone('');
                setMeasLen('');
                setMeasSh('');
                setMeasChest('');
                setMeasWaist('');
                setMeasHip('');
                setMeasSleeve('');
                setMeasNote('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={measName}
                  onChange={(e) => setMeasName(e.target.value)}
                  placeholder="اسم الزبونة *"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="tel"
                  value={measPhone}
                  onChange={(e) => setMeasPhone(e.target.value)}
                  placeholder="الهاتف (اختياري)"
                  className="tabular-nums rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                <input
                  type="text"
                  value={measLen}
                  onChange={(e) => setMeasLen(e.target.value)}
                  placeholder="الطول"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={measSh}
                  onChange={(e) => setMeasSh(e.target.value)}
                  placeholder="الكتف"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={measChest}
                  onChange={(e) => setMeasChest(e.target.value)}
                  placeholder="الصدر"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={measWaist}
                  onChange={(e) => setMeasWaist(e.target.value)}
                  placeholder="الخصر"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={measHip}
                  onChange={(e) => setMeasHip(e.target.value)}
                  placeholder="الأرداف"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  value={measSleeve}
                  onChange={(e) => setMeasSleeve(e.target.value)}
                  placeholder="الكم"
                  className="rounded-xl border border-slate-300 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={measNote}
                  onChange={(e) => setMeasNote(e.target.value)}
                  placeholder="ملاحظات (رقبة دائرية، كتان...)"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-bold text-white"
                >
                  حفظ المقاسات
                </button>
              </div>
            </form>

            <input
              type="text"
              value={measSearch}
              onChange={(e) => setMeasSearch(e.target.value)}
              placeholder="ابحثي باسم الزبونة..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="mt-3 space-y-2">
              {(db.measurements || [])
                .filter((m) => !measSearch.trim() || m.name.includes(measSearch.trim()))
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                  >
                    <div>
                      <strong className="text-sm">{m.name}</strong>
                      <div className="mt-1 text-slate-600 dark:text-slate-300">
                        الطول: {m.len || '—'} · الكتف: {m.sh || '—'} · الصدر: {m.chest || '—'} ·
                        الخصر: {m.waist || '—'} · الأرداف: {m.hip || '—'} · الكم: {m.sleeve || '—'}
                      </div>
                      {m.note && <div className="mt-0.5 text-slate-500">{m.note}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteMeasurement(m.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          </section>

          {/* Customer Sewing Service */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold">تسجيل خدمة خياطة للزبونة (بقماشها)</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!svcClient.trim() || !svcItem.trim() || svcPrice <= 0) return;
                onAddSewService({
                  client: svcClient.trim(),
                  item: svcItem.trim(),
                  meters: Math.max(0, Number(svcMeters) || 0),
                  rate: Math.max(0, Number(svcRate) || 0),
                  price: svcPrice,
                  thread: Math.max(0, Number(svcThread) || 0),
                  supplies: Math.max(0, Number(svcSupplies) || 0),
                  paid: Math.min(svcPrice, Math.max(0, Number(svcPaid) || 0)),
                });
                setSvcClient('');
                setSvcItem('');
                setSvcMeters('');
                setSvcThread('');
                setSvcSupplies('');
                setSvcPaid('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={svcClient}
                  onChange={(e) => setSvcClient(e.target.value)}
                  placeholder="اسم الزبونة"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  required
                  value={svcItem}
                  onChange={(e) => setSvcItem(e.target.value)}
                  placeholder="نوع الخياطة (قندورة...)"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={svcMeters}
                  onChange={(e) => setSvcMeters(e.target.value)}
                  placeholder="أمتار قماش الزبونة"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={svcRate}
                  onChange={(e) => setSvcRate(e.target.value)}
                  placeholder="سعر المتر (دج)"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={svcThread}
                  onChange={(e) => setSvcThread(e.target.value)}
                  placeholder="تكلفة الخيط"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={svcSupplies}
                  onChange={(e) => setSvcSupplies(e.target.value)}
                  placeholder="تكلفة لوازم أخرى"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={svcPaid}
                  onChange={(e) => setSvcPaid(e.target.value)}
                  placeholder="المبلغ المقبوض (دج)"
                  className="tabular-nums flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white"
                >
                  تسجيل الخدمة (ربح متوقع {fmt(svcProfit)})
                </button>
              </div>
            </form>

            {(db.sewServices || []).length > 0 && (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {db.sewServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <strong>
                        {s.client} — {s.item}
                      </strong>
                      <div className="text-slate-500">
                        {s.meters}م · السعر {fmt(s.price)} · المقبوض {fmt(s.paid)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteSewService(s.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Customer Directory */}
          {customerProfiles.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">سجل الزبونات الموحد</h3>
              <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {customerProfiles.map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 text-xs">
                    <strong>{c.name}</strong>
                    <span className="text-slate-500">
                      {c.orders} طلبيات · {c.meas} مقاسات · {fmt(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ================= TAB 4: WORKSHOP INVENTORY & OWN PROJECTS ================= */}
      {sewTab === 'workshop' && (
        <div className="space-y-4">
          {/* Materials Stock */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold">
              مخزون الخيوط واللوازم ({(db.sewMaterials || []).length} مادة)
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = Number(matQty);
                if (!matName.trim() || !Number.isFinite(q) || q <= 0) return;
                onAddSewMaterial({
                  name: matName.trim(),
                  unit: matUnit,
                  qty: q,
                  cost: Math.max(0, Number(matCost) || 0),
                  min: Math.max(0, Number(matMin) || 0),
                });
                setMatName('');
                setMatQty('');
                setMatCost('');
              }}
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
            >
              <input
                type="text"
                required
                value={matName}
                onChange={(e) => setMatName(e.target.value)}
                placeholder="اسم المادة (خيط، سحاب...)"
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <select
                value={matUnit}
                onChange={(e) => setMatUnit(e.target.value)}
                className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="قطعة">قطعة</option>
                <option value="بكرة">بكرة</option>
                <option value="متر">متر</option>
                <option value="علبة">علبة</option>
                <option value="كيس">كيس</option>
              </select>
              <input
                type="number"
                step="0.1"
                min={0.1}
                required
                value={matQty}
                onChange={(e) => setMatQty(e.target.value)}
                placeholder="الكمية"
                className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="number"
                min={0}
                value={matCost}
                onChange={(e) => setMatCost(e.target.value)}
                placeholder="تكلفة الوحدة"
                className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="col-span-2 rounded-xl bg-violet-700 py-2 text-xs font-bold text-white sm:col-span-1"
              >
                + إضافة للمخزون
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {(db.sewMaterials || []).length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  لم تسجل مواد في مخزون الورشة بعد.
                </p>
              ) : (
                db.sewMaterials.map((m) => {
                  const low = m.qty <= m.min;
                  return (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <strong className="text-sm">{m.name}</strong>
                        <div className="text-slate-500">
                          المتوفر: {m.qty} {m.unit} · تكلفة الوحدة: {fmt(m.cost)}
                          {low && <span className="mr-2 font-bold text-rose-600">مخزون منخفض</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUseSewMaterial(m)}
                          className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          استعمال
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSewMaterial(m.id)}
                          className="text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Own Sewing Projects */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold">مشاريعي الخاصة (إنتاج الورشة للبيع)</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!prjName.trim()) return;
                onAddSewProject({
                  name: prjName.trim(),
                  meters: Math.max(0, Number(prjMeters) || 0),
                  fabricRate: Math.max(0, Number(prjFabRate) || 0),
                  fabric: prjFabricTotal,
                  supplies: Math.max(0, Number(prjSupplies) || 0),
                  other: Math.max(0, Number(prjOther) || 0),
                  sale: Math.max(0, Number(prjSale) || 0),
                  paid: Math.max(0, Number(prjPaid) || 0),
                  status: prjStatus,
                });
                setPrjName('');
                setPrjMeters('');
                setPrjFabRate('');
                setPrjSupplies('');
                setPrjOther('');
                setPrjSale('');
                setPrjPaid('');
              }}
              className="mt-3 space-y-2.5"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  required
                  value={prjName}
                  onChange={(e) => setPrjName(e.target.value)}
                  placeholder="اسم المشروع / الموديل"
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={prjMeters}
                  onChange={(e) => setPrjMeters(e.target.value)}
                  placeholder="أمتار القماش"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={prjFabRate}
                  onChange={(e) => setPrjFabRate(e.target.value)}
                  placeholder="ثمن متر القماش"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  type="number"
                  min={0}
                  value={prjSupplies}
                  onChange={(e) => setPrjSupplies(e.target.value)}
                  placeholder="خيط ولوازم"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={prjSale}
                  onChange={(e) => setPrjSale(e.target.value)}
                  placeholder="سعر البيع"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={0}
                  value={prjPaid}
                  onChange={(e) => setPrjPaid(e.target.value)}
                  placeholder="المحصّل فعلياً"
                  className="tabular-nums rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <select
                  value={prjStatus}
                  onChange={(e) => setPrjStatus(e.target.value as 'work' | 'ready' | 'sold')}
                  className="rounded-xl border border-slate-300 px-2.5 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="work">قيد التصنيع</option>
                  <option value="ready">جاهز للبيع</option>
                  <option value="sold">تم البيع</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white"
              >
                + تسجيل مشروع خاص (التكلفة {fmt(prjTotalCost)} · الربح المتوقع{' '}
                {fmt(prjExpectedProfit)})
              </button>
            </form>

            {(db.sewProjects || []).length > 0 && (
              <div className="mt-3 space-y-2">
                {db.sewProjects.map((p) => {
                  const cost = p.fabric + p.supplies + p.other;
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"
                    >
                      <div>
                        <strong className="text-sm">{p.name}</strong>
                        <div className="text-slate-500">
                          التكلفة: {fmt(cost)} · البيع: {fmt(p.sale)} · الربح:{' '}
                          {fmt(p.sale - cost)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteSewProject(p.id)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= TAB 5: FINANCE & DEBTS ================= */}
      {sewTab === 'finance' && (
        <div className="space-y-4">
          {/* Receivables */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-bold">مستحقات الزبائن (الطلبيات غير خالصة الدفع)</h2>
            <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
              {db.orders.filter((o) => o.price - o.paid > 0).length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  كل الطلبيات مسدّدة بالكامل.
                </p>
              ) : (
                db.orders
                  .filter((o) => o.price - o.paid > 0)
                  .map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <strong>
                          {o.client} — {o.model}
                        </strong>
                        <div className="tabular-nums text-amber-600">
                          المتبقي: {fmt(o.price - o.paid)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCollectOrderPayment(o)}
                        className="rounded-xl bg-emerald-700 px-3 py-1.5 font-bold text-white"
                      >
                        تحصيل
                      </button>
                    </div>
                  ))
              )}
            </div>
          </section>

          {/* Monthly Sewing Report */}
          <section className="print-only-sheet rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold">تقرير الخياطة الشهري — {formatYM(repMonth)}</h2>
              <div className="no-print flex items-center gap-2">
                <input
                  type="month"
                  value={repMonth}
                  onChange={(e) => setRepMonth(e.target.value)}
                  className="rounded-xl border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 rounded-xl bg-violet-700 px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Printer className="h-3.5 w-3.5" />
                  طباعة
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                <div className="text-slate-500">الطلبيات</div>
                <strong className="tabular-nums text-sm">{monthlyStats.count}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                <div className="text-slate-500">المبيعات</div>
                <strong className="tabular-nums text-sm">{fmt(monthlyStats.sales)}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                <div className="text-slate-500">التكاليف</div>
                <strong className="tabular-nums text-sm text-rose-600">{fmt(monthlyStats.costs)}</strong>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
                <div className="text-slate-500">صافي الربح</div>
                <strong className="tabular-nums text-sm text-emerald-700">{fmt(monthlyStats.profit)}</strong>
              </div>
            </div>
          </section>

          {/* Sewing Cashbox Quick Tools */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">حركات صندوق الخياطة السريعة</h3>
              {/* Meter Income */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt =
                    Math.max(0, Number(meterInCnt) || 0) * Math.max(0, Number(meterInPrice) || 0);
                  if (amt <= 0) return;
                  onSewCashMovement(
                    'in',
                    meterInNote.trim() || `خياطة ${meterInCnt} متر`,
                    amt
                  );
                  setMeterInNote('');
                }}
                className="space-y-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800"
              >
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  تسجيل مدخول بالمتر
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min={0.5}
                    value={meterInCnt}
                    onChange={(e) => setMeterInCnt(e.target.value)}
                    placeholder="الأمتار"
                    className="tabular-nums rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    min={1}
                    value={meterInPrice}
                    onChange={(e) => setMeterInPrice(e.target.value)}
                    placeholder="سعر المتر"
                    className="tabular-nums rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button type="submit" className="rounded-lg bg-emerald-700 text-xs font-bold text-white">
                    إضافة ({fmt((Number(meterInCnt) || 0) * (Number(meterInPrice) || 0))})
                  </button>
                </div>
                <input
                  type="text"
                  value={meterInNote}
                  onChange={(e) => setMeterInNote(e.target.value)}
                  placeholder="وصف / اسم الزبونة (اختياري)"
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </form>

              {/* Thread & Manual Expense */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt =
                    Math.max(0, Number(threadCnt) || 0) * Math.max(0, Number(threadUnitCost) || 0);
                  if (amt <= 0) return;
                  onSewCashMovement('out', `استهلاك خيط (${threadCnt})`, amt);
                }}
                className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 p-2.5 dark:border-slate-800"
              >
                <input
                  type="number"
                  min={1}
                  value={threadCnt}
                  onChange={(e) => setThreadCnt(e.target.value)}
                  placeholder="عدد الخيط"
                  className="tabular-nums rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  value={threadUnitCost}
                  onChange={(e) => setThreadUnitCost(e.target.value)}
                  placeholder="السعر"
                  className="tabular-nums rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button type="submit" className="rounded-lg bg-rose-600 text-xs font-bold text-white">
                  خصم خيط ({fmt((Number(threadCnt) || 0) * (Number(threadUnitCost) || 0))})
                </button>
              </form>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = Number(manualSewAmt);
                  if (!manualSewName.trim() || !Number.isFinite(amt) || amt <= 0) return;
                  onSewCashMovement('out', manualSewName.trim(), amt);
                  setManualSewName('');
                  setManualSewAmt('');
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={manualSewName}
                  onChange={(e) => setManualSewName(e.target.value)}
                  placeholder="مصروف يدوي (قماش، إبر...)"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  value={manualSewAmt}
                  onChange={(e) => setManualSewAmt(e.target.value)}
                  placeholder="المبلغ"
                  className="tabular-nums w-24 rounded-xl border border-slate-300 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button type="submit" className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
                  خصم
                </button>
              </form>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = Number(trHomeAmt);
                  if (!Number.isFinite(amt) || amt <= 0) return;
                  onTransferSewingToFamily(amt);
                  setTrHomeAmt('');
                }}
                className="flex gap-2"
              >
                <input
                  type="number"
                  min={1}
                  value={trHomeAmt}
                  onChange={(e) => setTrHomeAmt(e.target.value)}
                  placeholder="مبلغ التحويل للحساب العائلي (دج)"
                  className="tabular-nums flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button type="submit" className="rounded-xl bg-sky-700 px-3 py-1.5 text-xs font-bold text-white">
                  تحويل للبيت
                </button>
              </form>
            </section>

            {/* Sewing Debts */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold">ديون الورشة والزبائن</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const amt = Number(debtAmt);
                  if (!debtName.trim() || !Number.isFinite(amt) || amt <= 0) return;
                  onAddSewDebt({
                    type: debtType,
                    name: debtName.trim(),
                    amount: amt,
                    due: debtDue || undefined,
                  });
                  setDebtName('');
                  setDebtAmt('');
                  setDebtDue('');
                }}
                className="mt-3 space-y-2"
              >
                <select
                  value={debtType}
                  onChange={(e) => setDebtType(e.target.value as 'in' | 'out')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="in">دين لكِ عند زبون (+)</option>
                  <option value="out">دين عليكِ لمحل (-)</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={debtName}
                    onChange={(e) => setDebtName(e.target.value)}
                    placeholder="الاسم"
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <input
                    type="number"
                    min={1}
                    value={debtAmt}
                    onChange={(e) => setDebtAmt(e.target.value)}
                    placeholder="المبلغ (دج)"
                    className="tabular-nums rounded-xl border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={debtDue}
                    onChange={(e) => setDebtDue(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white"
                  >
                    تسجيل الدين
                  </button>
                </div>
              </form>

              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {(db.debts || []).length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">لا توجد ديون مسجلة للورشة.</p>
                ) : (
                  db.debts.map((d) => {
                    const rem = Math.max(0, d.amount - d.paid);
                    return (
                      <div key={d.id} className="flex items-center justify-between py-2 text-xs">
                        <div>
                          <strong>
                            {d.name} ({d.type === 'in' ? 'لكِ' : 'عليكِ'})
                          </strong>
                          <div className="tabular-nums text-slate-500">
                            المتبقي: {fmt(rem)} / {fmt(d.amount)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rem > 0 && (
                            <button
                              type="button"
                              onClick={() => onPaySewDebt(d)}
                              className="rounded-lg bg-emerald-700 px-2.5 py-1 text-white"
                            >
                              تسديد
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteSewDebt(d.id)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>
      )}

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
