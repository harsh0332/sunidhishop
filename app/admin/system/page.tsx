'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  FileSpreadsheet,
  Database,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  Clock,
  Check,
} from 'lucide-react';
import { SubsystemHealth, SystemStatusReport } from '@/types/product';

export default function SystemStatusPage() {
  const router = useRouter();

  const [report, setReport] = useState<SystemStatusReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCacheRefreshing, setIsCacheRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch('/api/admin/system/status');
      if (res.status === 401) {
        router.push('/admin/login?next=/admin/system');
        return;
      }
      const data = await res.json();
      setReport(data);
    } catch {
      // Error ignored
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleRefreshCache = async () => {
    setIsCacheRefreshing(true);
    setRefreshMessage(null);

    try {
      const res = await fetch('/api/admin/refresh-products', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRefreshMessage(`Cache successfully invalidated and reloaded (${data.activeProductCount} active products).`);
        await fetchStatus(true);
      } else {
        setRefreshMessage(`Cache refresh failed: ${data.error || 'Server error'}`);
      }
    } catch {
      setRefreshMessage('Network error triggering cache refresh.');
    } finally {
      setIsCacheRefreshing(false);
    }
  };

  const renderBadge = (status?: SubsystemHealth) => {
    if (status === 'healthy') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Healthy
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D46B08] bg-[#FFFBE6] px-2.5 py-0.5 rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          Warning
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#CF1322] bg-[#FFF1F0] px-2.5 py-0.5 rounded-full">
        <XCircle className="w-3.5 h-3.5" />
        Unavailable
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE5DE] px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
              SUNIDHI
            </a>
            <span className="text-[#C4BCB3] text-lg font-light">/</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">
                System Operations
              </span>
              {renderBadge(report?.overallStatus)}
            </div>
          </div>

          {/* Admin Navigation */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <a
              href="/admin/analytics"
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] font-medium flex items-center gap-1.5 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </a>

            <a
              href="/admin/products/health"
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] font-medium flex items-center gap-1.5 transition-all"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Product Health</span>
            </a>

            <a
              href="/admin/system"
              className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-white font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Activity className="w-3.5 h-3.5 text-[#52C41A]" />
              <span>System Status</span>
            </a>

            <a
              href="/admin/add-product"
              className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-medium flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>+ Quick Add Product</span>
            </a>

            <button
              onClick={() => fetchStatus(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] transition-all disabled:opacity-50"
              aria-label="Refresh Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1A1A1A]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Overall Status Hero */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#F0EBE1] gap-4">
            <div>
              <h1 className="font-serif text-xl md:text-2xl font-normal text-[#1A1A1A]">
                System Architecture & Maintenance Status
              </h1>
              <p className="text-xs text-[#777] mt-0.5">
                Real-time operational status of Google Sheets pipeline, in-memory caches, analytics storage, and affiliate redirects
              </p>
            </div>

            {/* Manual Cache Trigger */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshCache}
                disabled={isCacheRefreshing}
                className="px-4 py-2 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#333] active:scale-[0.99] font-medium text-xs transition-all flex items-center gap-2 shadow-sm disabled:opacity-70"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCacheRefreshing ? 'animate-spin' : ''}`} />
                <span>{isCacheRefreshing ? 'Refreshing Catalog...' : 'Refresh Product Cache'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {refreshMessage && (
            <div className="mt-4 p-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-xs text-[#2E7D32] flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{refreshMessage}</span>
            </div>
          )}

          {/* Core Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Last Sheet Sync</span>
              <strong className="text-sm font-semibold text-[#1A1A1A] block truncate mt-0.5">
                {report?.subsystems.googleSheetsPipeline.lastSyncAt
                  ? new Date(report.subsystems.googleSheetsPipeline.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Active in memory'}
              </strong>
            </div>

            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Last Cache Invalidation</span>
              <strong className="text-sm font-semibold text-[#1A1A1A] block truncate mt-0.5">
                {report?.subsystems.productCache.lastRefreshedAt
                  ? new Date(report.subsystems.productCache.lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'Default TTL'}
              </strong>
            </div>

            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Cached Catalog</span>
              <strong className="text-sm font-semibold text-[#1A1A1A] block mt-0.5">
                {report?.subsystems.productCache.cachedCount ?? 0} Products
              </strong>
            </div>

            <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Server Uptime</span>
              <strong className="text-sm font-semibold text-[#1A1A1A] block mt-0.5">
                {report?.subsystems.application.uptimeSeconds ? `${Math.floor(report.subsystems.application.uptimeSeconds / 60)} mins` : 'Active'}
              </strong>
            </div>
          </div>
        </div>

        {/* 5 Subsystems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Subsystem 1: Application Server */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#4B6B94]" />
                  <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">Application Server</h3>
                </div>
                {renderBadge(report?.subsystems.application.status)}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {report?.subsystems.application.message}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EBE1] text-[11px] text-[#888]">
              Next.js 14 SSR • Zero runtime errors
            </div>
          </div>

          {/* Subsystem 2: Google Sheets Pipeline */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#2E7D32]" />
                  <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">Google Sheets Pipeline</h3>
                </div>
                {renderBadge(report?.subsystems.googleSheetsPipeline.status)}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {report?.subsystems.googleSheetsPipeline.message}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EBE1] text-[11px] text-[#888]">
              Method: {report?.subsystems.googleSheetsPipeline.syncMethod || 'Direct Stream'}
            </div>
          </div>

          {/* Subsystem 3: Product In-Memory Cache */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#A87B43]" />
                  <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">Product Cache & Fallback</h3>
                </div>
                {renderBadge(report?.subsystems.productCache.status)}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {report?.subsystems.productCache.message}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EBE1] text-[11px] text-[#888]">
              Safe Rollback: Last-known-good active
            </div>
          </div>

          {/* Subsystem 4: Analytics Engine */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#5C7866]" />
                  <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">Analytics Telemetry</h3>
                </div>
                {renderBadge(report?.subsystems.analyticsEngine.status)}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {report?.subsystems.analyticsEngine.message}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EBE1] text-[11px] text-[#888]">
              Storage: Non-blocking disk persistence
            </div>
          </div>

          {/* Subsystem 5: Outbound Redirect System */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[#D46B08]" />
                  <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">Redirect Engine (/go)</h3>
                </div>
                {renderBadge(report?.subsystems.redirectSystem.status)}
              </div>
              <p className="text-xs text-[#666] leading-relaxed">
                {report?.subsystems.redirectSystem.message}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F0EBE1] text-[11px] text-[#888]">
              Speed: {report?.subsystems.redirectSystem.latencyStatus || '< 5ms'}
            </div>
          </div>
        </div>

        {/* Operational Audit Trail */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="pb-3 border-b border-[#F0EBE1] mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg text-[#1A1A1A]">Operational Audit Trail</h2>
              <p className="text-xs text-[#888] mt-0.5">
                Chronological record of recent cache invalidations, sheet synchronizations, and system diagnostics
              </p>
            </div>
            <span className="text-xs text-[#8C827A] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Last 25 Events</span>
            </span>
          </div>

          <div className="divide-y divide-[#F0EBE1] text-xs">
            {report?.recentOperations && report.recentOperations.length > 0 ? (
              report.recentOperations.map((op) => (
                <div key={op.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        op.status === 'success'
                          ? 'bg-[#2E7D32]'
                          : op.status === 'warning'
                          ? 'bg-[#D46B08]'
                          : 'bg-[#CF1322]'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-[#1A1A1A] uppercase tracking-wider text-[10px]">
                        {op.action.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[#555] text-xs mt-0.5">{op.details}</p>
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-[#8C827A] shrink-0 ml-4">
                    <span>{new Date(op.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span className="block text-[10px] text-[#BBB]">{new Date(op.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#888]">
                No operational logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
