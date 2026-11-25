import React, { useEffect, useState } from 'react';
import {
  Camera,
  Database,
  Download,
  Lock,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { SandooqiDB } from '../types/sandooqi';
import { daysUntil, fmt, localDateISO } from '../utils/finance';
import { compressImageFile, estimateStorageUsage } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface ToolsSettingsViewProps {
  db: SandooqiDB;
  onAddWarranty: (payload: {
    deviceName: string;
    category: string;
    shopOrBrand: string;
    purchaseDateIso: string;
    warrantyEndDateIso: string;
    cost: number;
    photoData: string;
  }) => void;
  onDeleteWarranty: (id: number) => void;
  onPreviewPhoto: (src: string, title: string) => void;
  onAddFamilyMember: (name: string) => void;
  onRemoveFamilyMember: (name: string) => void;
  onEnableFamilyMode: () => void;
  onChangePin: (newPin: string) => void;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAll: () => void;
}

export const ToolsSettingsView: React.FC<ToolsSettingsViewProps> = ({
  db,
  onAddWarranty,
  onDeleteWarranty,
  onPreviewPhoto,
  onAddFamilyMember,
  onRemoveFamilyMember,
  onEnableFamilyMode,
  onChangePin,
  onToggleDarkMode,
  onToggleSound,
  onExportBackup,
  onImportBackup,
  onResetAll,
}) => {
  const [devName, setDevName] = useState('');
  const [warCat, setWarCat] = useState('أجهزة منزلية');
  const [brand, setBrand] = useState('');
  const [buyDate, setBuyDate] = useState(localDateISO());
  const [endDate, setEndDate] = useState('');
  const [cost, setCost] = useState('');
  const [photoData, setPhotoData] = useState('');

  const [newMember, setNewMember] = useState('');
  const [newPin, setNewPin] = useState('');
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; quotaBytes: number | null }>({
    usedBytes: 0,
    quotaBytes: null,
  });

  useEffect(() => {
    estimateStorageUsage().then(setStorageInfo);
  }, [db]);

  const handleWarrantyPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImageFile(file);
    setPhotoData(compressed);
  };

  const usedMb = (storageInfo.usedBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Warranties Archive */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>أرشيف ضمانات الأجهزة والفواتير</span>
          </h2>
          <span className="tabular-nums text-xs font-semibold text-slate-500">
            {db.warranties.length} ملف
          </span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!devName.trim()) return;
            onAddWarranty({
              deviceName: devName.trim(),
              category: warCat,
              shopOrBrand: brand.trim(),
              purchaseDateIso: buyDate,
              warrantyEndDateIso: endDate,
              cost: Math.max(0, Number(cost) || 0),
              photoData,
            });
            setDevName('');
            setBrand('');
            setEndDate('');
            setCost('');
            setPhotoData('');
          }}
          className="mt-3 space-y-2.5"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              type="text"
              required
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="اسم الجهاز / الغرض"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <select
              value={warCat}
              onChange={(e) => setWarCat(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold outline-none dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="أجهزة منزلية">أجهزة منزلية</option>
              <option value="إلكترونيات وهواتف">إلكترونيات وهواتف</option>
              <option value="قطع غيار">قطع غيار</option>
              <option value="أخرى">أخرى</option>
            </select>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="المحل أو الماركة"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                تاريخ الشراء
              </label>
              <input
                type="date"
                value={buyDate}
                onChange={(e) => setBuyDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                انتهاء الضمان
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                السعر (دج)
              </label>
              <input
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className="tabular-nums w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Camera className="h-4 w-4" />
              <span>{photoData ? 'تم إرفاق صورة الضمان ✓' : 'صورة الفاتورة / الضمان'}</span>
              <input type="file" accept="image/*" onChange={handleWarrantyPhoto} className="hidden" />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              حفظ في الأرشيف
            </button>
          </div>
        </form>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {db.warranties.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">لا توجد ضمانات محفوظة بعد.</p>
          ) : (
            db.warranties.map((w) => {
              const d = daysUntil(w.warrantyEndDateIso);
              const status =
                d === null
                  ? 'بدون تاريخ انتهاء'
                  : d < 0
                    ? 'منتهي الصلاحية'
                    : d <= 30
                      ? `ينتهي خلال ${d} يوم`
                      : `سارٍ (${d} يوم)`;
              return (
                <div key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div>
                    <div className="text-sm font-bold">{w.deviceName}</div>
                    <div className="text-xs text-slate-500">
                      {w.category}
                      {w.shopOrBrand ? ` · ${w.shopOrBrand}` : ''} · {status}
                      {w.cost > 0 ? ` · ${fmt(w.cost)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {w.photoData && (
                      <button
                        type="button"
                        onClick={() => onPreviewPhoto(w.photoData, w.deviceName)}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold dark:border-slate-700"
                      >
                        عرض الصورة
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDeleteWarranty(w.id)}
                      aria-label="حذف"
                      className="rounded p-1 text-slate-400 hover:text-rose-600"
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

      {/* Family & Security */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>أفراد العائلة ووضع التسجيل المقيد</span>
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newMember.trim()) return;
              onAddFamilyMember(newMember.trim());
              setNewMember('');
            }}
            className="mt-3 flex gap-2"
          >
            <input
              type="text"
              value={newMember}
              onChange={(e) => setNewMember(e.target.value)}
              placeholder="إضافة اسم فرد جديد..."
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              إضافة
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {db.family.map((m) => (
              <div
                key={m}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800"
              >
                <span>{m}</span>
                {db.family.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveFamilyMember(m)}
                    aria-label={`حذف ${m}`}
                    className="text-slate-400 hover:text-rose-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onEnableFamilyMode}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>تفعيل وضع أفراد العائلة (تسجيل المشتريات فقط)</span>
          </button>
        </section>

        {/* PIN, Theme, PWA & Backup */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Database className="h-4 w-4 text-sky-600" />
            <span>الإعدادات والنسخ الاحتياطي وتثبيت التطبيق</span>
          </h2>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
            >
              {db.darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{db.darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
            </button>
            <button
              type="button"
              onClick={onToggleSound}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold dark:border-slate-700"
            >
              {db.sound ? 'المؤثرات: مفعّلة' : 'المؤثرات: مكتومة'}
            </button>
            <PWAInstallButton />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newPin.trim().length < 4) return;
              onChangePin(newPin.trim());
              setNewPin('');
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="تغيير الرمز السري للمدير (4+ أرقام)"
              className="tabular-nums flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none dark:border-slate-700 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-bold text-white dark:bg-slate-700"
            >
              حفظ الرمز
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50">
            <div className="flex justify-between font-semibold">
              <span>التخزين المحلي (IndexedDB)</span>
              <span className="tabular-nums">{usedMb} MB مستخدم</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>تنزيل نسخة احتياطية JSON</span>
            </button>
            <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <Upload className="h-3.5 w-3.5" />
              <span>استيراد نسخة احتياطية</span>
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportBackup(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onResetAll}
            className="w-full rounded-xl border border-rose-300 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
          >
            تصفير جميع البيانات
          </button>
        </section>
      </div>
    </div>
  );
};
