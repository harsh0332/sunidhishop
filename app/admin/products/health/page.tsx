'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Eye,
  Filter,
  BarChart3,
  Activity,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { CatalogHealthSummary, ProductHealthGrade, ProductHealthReport } from '@/types/product';

export default function ProductHealthPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<CatalogHealthSummary | null>(null);
  const [reports, setReports] = useState<ProductHealthReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [gradeFilter, setGradeFilter] = useState<'all' | ProductHealthGrade>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHealthData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch('/api/admin/products/health');
      if (res.status === 401) {
        router.push('/admin/login?next=/admin/products/health');
        return;
      }
      const data = await res.json();
      setSummary(data.summary);
      setReports(data.reports || []);
    } catch {
      // Network error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (gradeFilter !== 'all' && r.grade !== gradeFilter) return false;
    if (statusFilter !== 'all' && r.product.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        r.product.title?.toLowerCase().includes(q) ||
        r.product.brand?.toLowerCase().includes(q) ||
        r.product.slug?.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
                Product Health
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFFBE6] text-[#D46B08]">
                Diagnostics
              </span>
            </div>
          </div>

          {/* Admin Suite Navigation */}
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
              className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-white font-medium flex items-center gap-1.5 shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#E6A055]" />
              <span>Product Health</span>
            </a>

            <a
              href="/admin/system"
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] font-medium flex items-center gap-1.5 transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>System Status</span>
            </a>

            <button
              onClick={() => fetchHealthData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] transition-all disabled:opacity-50"
              aria-label="Refresh Health Diagnostics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1A1A1A]' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Quality Banner */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
            <div>
              <h1 className="font-serif text-xl md:text-2xl font-normal text-[#1A1A1A]">
                Catalog Quality & Validation Report
              </h1>
              <p className="text-xs text-[#777] mt-0.5">
                Evaluates product rows for required fields, image resolution, pricing validity, and affiliate link structure
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8C827A]">
              <FileSpreadsheet className="w-4 h-4 text-[#2E7D32]" />
              <span>Master Sheet Source: <strong>Products</strong></span>
            </div>
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-4 text-xs">
            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Total Rows</span>
              <strong className="text-lg font-serif text-[#1A1A1A]">{summary?.total ?? 0}</strong>
            </div>

            <div className="bg-[#E8F5E9]/50 p-3 rounded-xl border border-[#C8E6C9]">
              <span className="block text-[10px] text-[#2E7D32] uppercase font-semibold">Healthy</span>
              <strong className="text-lg font-serif text-[#2E7D32]">{summary?.healthy ?? 0}</strong>
            </div>

            <div className="bg-[#FFFBE6] p-3 rounded-xl border border-[#FFE58F]">
              <span className="block text-[10px] text-[#D46B08] uppercase font-semibold">Warnings</span>
              <strong className="text-lg font-serif text-[#D46B08]">{summary?.warnings ?? 0}</strong>
            </div>

            <div className="bg-[#FFF1F0] p-3 rounded-xl border border-[#FFCCC7]">
              <span className="block text-[10px] text-[#CF1322] uppercase font-semibold">Invalid</span>
              <strong className="text-lg font-serif text-[#CF1322]">{summary?.invalid ?? 0}</strong>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#666] uppercase font-medium">Published</span>
              <strong className="text-lg font-serif text-[#1A1A1A]">{summary?.published ?? 0}</strong>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Draft</span>
              <strong className="text-lg font-serif text-[#777]">{summary?.draft ?? 0}</strong>
            </div>

            <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#EDE7DD]">
              <span className="block text-[10px] text-[#888] uppercase font-medium">Archived</span>
              <strong className="text-lg font-serif text-[#999]">{summary?.archived ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#999] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product, brand, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1A1A1A] placeholder-[#888] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                gradeFilter === 'all'
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#FAF8F5] text-[#666] hover:text-[#111] border border-[#DDD7CD]'
              }`}
            >
              All Items ({reports.length})
            </button>

            <button
              onClick={() => setGradeFilter('invalid')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                gradeFilter === 'invalid'
                  ? 'bg-[#CF1322] text-white'
                  : 'bg-[#FFF1F0] text-[#CF1322] border border-[#FFCCC7]'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Invalid ({summary?.invalid ?? 0})</span>
            </button>

            <button
              onClick={() => setGradeFilter('warning')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                gradeFilter === 'warning'
                  ? 'bg-[#D46B08] text-white'
                  : 'bg-[#FFFBE6] text-[#D46B08] border border-[#FFE58F]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Warnings ({summary?.warnings ?? 0})</span>
            </button>

            <button
              onClick={() => setGradeFilter('healthy')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                gradeFilter === 'healthy'
                  ? 'bg-[#2E7D32] text-white'
                  : 'bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Healthy ({summary?.healthy ?? 0})</span>
            </button>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl px-3 py-1.5 text-[#333] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Published)</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Master Diagnostics Table */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Product & Identification</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Health Grade</th>
                  <th className="py-3.5 px-4">Detected Operational Issues</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {filteredReports.length > 0 ? (
                  filteredReports.map((report) => {
                    const p = report.product;
                    return (
                      <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-[#1A1A1A] block">{p.title || 'Untitled Product'}</span>
                          <span className="text-[11px] text-[#777]">
                            {p.brand || 'No Brand'} • {p.store || 'No Store'} • ₹{p.price?.toLocaleString('en-IN') || '0'}
                          </span>
                          <span className="text-[10px] text-[#999] block font-mono mt-0.5">{p.slug}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              p.status === 'active'
                                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                : p.status === 'draft'
                                ? 'bg-[#FFFBE6] text-[#D46B08]'
                                : 'bg-[#F5F5F5] text-[#888]'
                            }`}
                          >
                            {p.status}
                          </span>
                          {p.publishAt && (
                            <span className="block text-[10px] text-[#888] mt-1">
                              Drops: {new Date(p.publishAt).toLocaleDateString()}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {report.grade === 'healthy' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D32]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Healthy
                            </span>
                          )}
                          {report.grade === 'warning' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D46B08]">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Warning
                            </span>
                          )}
                          {report.grade === 'invalid' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#CF1322]">
                              <XCircle className="w-3.5 h-3.5" />
                              Invalid
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {report.issues.length > 0 ? (
                            <div className="space-y-1">
                              {report.issues.map((iss, i) => (
                                <div
                                  key={i}
                                  className={`text-[11px] flex items-center gap-1.5 ${
                                    iss.severity === 'invalid' ? 'text-[#CF1322]' : 'text-[#D46B08]'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      iss.severity === 'invalid' ? 'bg-[#CF1322]' : 'bg-[#D46B08]'
                                    }`}
                                  />
                                  <span>{iss.message}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#8C827A]">No issues detected</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <a
                              href={`/admin/preview/product/${p.slug}`}
                              className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#DDD7CD] text-[#333] hover:bg-[#1A1A1A] hover:text-white transition-all text-[11px] font-medium inline-flex items-center gap-1"
                              title="Preview in draft mode"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Preview</span>
                            </a>

                            {p.status === 'active' && (
                              <a
                                href={`/product/${p.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-[#888] hover:text-[#111] transition-colors"
                                title="View public page"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#888]">
                      No products match the selected health and status filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
