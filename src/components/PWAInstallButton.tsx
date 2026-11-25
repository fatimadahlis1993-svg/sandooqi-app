import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25'
            : 'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800'
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={
            compact
              ? 'inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25'
              : 'inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40'
          }
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          <span>تثبيت على iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تثبيت صندوقي على iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="إغلاق"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                <li>1. اضغط على زر المشاركة (Share) في شريط متصفح Safari.</li>
                <li>2. مرر للأسفل واختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
                <li>3. اضغط «إضافة» ليعمل التطبيق دون إنترنت مثل التطبيقات المثبتة.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-xs font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200">
      <span className="inline-flex items-center gap-1.5">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        وضع عدم الاتصال — يتم الحفظ محلياً في IndexedDB بكل أمان
      </span>
    </div>
  );
};
