'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Eye,
  Users,
  Film,
  Layers,
  Sparkles,
  AlertTriangle,
  Download,
  RefreshCw,
  LogOut,
  Search,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Smartphone,
  Globe,
  Filter,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  AdminOverviewKPIs,
  CampaignPerformanceMetric,
  CategoryPerformanceMetric,
  ContentPerformanceMetric,
  DevicePerformanceMetric,
  ProductPerformanceMetric,
  RecentActivityItem,
  SourcePerformanceMetric,
  UtmPerformanceMetric,
} from '@/types/analytics';

type ActiveTab = 'products' | 'content' | 'categories' | 'sources' | 'activity';
type DateRange = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

export default function AdminAnalyticsDashboard() {
  const router = useRouter();

  // Filter States
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [humanOnly, setHumanOnly] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data States
  const [overview, setOverview] = useState<AdminOverviewKPIs | null>(null);
  const [productsData, setProductsData] = useState<{
    products: ProductPerformanceMetric[];
    highIntentProducts: ProductPerformanceMetric[];
    underperformingProducts: ProductPerformanceMetric[];
  } | null>(null);
  const [categories, setCategories] = useState<CategoryPerformanceMetric[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [content, setContent] = useState<ContentPerformanceMetric[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignPerformanceMetric[]>([]);
  const [sources, setSources] = useState<SourcePerformanceMetric[]>([]);
  const [utms, setUtms] = useState<UtmPerformanceMetric[]>([]);
  const [devices, setDevices] = useState<DevicePerformanceMetric[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  // Product Filter & Search
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'clicks' | 'views' | 'ctr'>('clicks');

  // Modal drill-downs
  const [selectedProductSlug, setSelectedProductSlug] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<any | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Help/Definitions Drawer
  const [showHelp, setShowHelp] = useState(false);

  // Trend chart metric selector
  const [chartMetric, setChartMetric] = useState<'all' | 'clicks' | 'views' | 'visitors'>('all');

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    params.set('range', dateRange);
    params.set('humanOnly', String(humanOnly));
    if (dateRange === 'custom') {
      if (customStart) params.set('startDate', customStart);
      if (customEnd) params.set('endDate', customEnd);
    }
    return params.toString();
  }, [dateRange, humanOnly, customStart, customEnd]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const q = buildQueryString();

      // Parallel data fetching
      const [
        overviewRes,
        productsRes,
        categoriesRes,
        merchantsRes,
        contentRes,
        campaignsRes,
        sourcesRes,
        devicesRes,
        activityRes,
      ] = await Promise.all([
        fetch(`/api/admin/analytics/overview?${q}`),
        fetch(`/api/admin/analytics/products?${q}&sortBy=${sortBy}`),
        fetch(`/api/admin/analytics/categories?${q}`),
        fetch(`/api/admin/analytics/merchants?${q}`),
        fetch(`/api/admin/analytics/content?${q}`),
        fetch(`/api/admin/analytics/campaigns?${q}`),
        fetch(`/api/admin/analytics/sources?${q}`),
        fetch(`/api/admin/analytics/devices?${q}`),
        fetch(`/api/admin/analytics/recent?limit=50`),
      ]);

      if (overviewRes.status === 401) {
        router.push('/admin/login?next=/admin/analytics');
        return;
      }

      const [
        overviewData,
        pData,
        catData,
        merchData,
        contData,
        campData,
        srcData,
        devData,
        actData,
      ] = await Promise.all([
        overviewRes.json(),
        productsRes.json(),
        categoriesRes.json(),
        merchantsRes.json(),
        contentRes.json(),
        campaignsRes.json(),
        sourcesRes.json(),
        devicesRes.json(),
        activityRes.json(),
      ]);

      setOverview(overviewData);
      setProductsData(pData);
      setCategories(catData.categories || []);
      setMerchants(merchData.merchants || []);
      setContent(contData.content || []);
      setCampaigns(campData.campaigns || []);
      setSources(srcData.sources || []);
      setUtms(srcData.utms || []);
      setDevices(devData.devices || []);
      setRecentActivity(actData.activity || []);
    } catch {
      // Network failure
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [buildQueryString, sortBy, router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      router.push('/admin/login');
    }
  };

  // Handle Product Detail Drill-down
  const openProductDetail = async (slug: string) => {
    setSelectedProductSlug(slug);
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/product-detail?slug=${slug}`);
      if (res.ok) {
        const data = await res.json();
        setProductDetail(data);
      }
    } catch {
      // Error ignored
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Export CSV helper
  const handleExport = (type: 'products' | 'daily' | 'content' | 'campaigns') => {
    window.location.href = `/api/admin/analytics/export?type=${type}`;
  };

  // Filtered products list
  const filteredProducts = (productsData?.products || []).filter((p) => {
    if (categoryFilter !== 'all' && p.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (storeFilter !== 'all' && p.store.toLowerCase() !== storeFilter.toLowerCase()) {
      return false;
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.productSlug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableStores = Array.from(
    new Set((productsData?.products || []).map((p) => p.store).filter(Boolean))
  );
  const availableCategories = Array.from(
    new Set((productsData?.products || []).map((p) => p.category).filter(Boolean))
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE5DE] px-4 lg:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="font-serif text-2xl font-bold tracking-tight text-[#1A1A1A]">
              SUNIDHI
            </a>
            <span className="text-[#C4BCB3] text-lg font-light">/</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#666]">
                Analytics
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F5E9] text-[#2E7D32]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
                Live
              </span>
            </div>

            {/* Admin Suite Navigation */}
            <div className="hidden lg:flex items-center gap-1.5 ml-2 pl-3 border-l border-[#EAE5DE] text-xs">
              <a
                href="/admin/analytics"
                className="px-2.5 py-1 rounded-lg bg-[#1A1A1A] text-white font-medium shadow-sm"
              >
                Analytics
              </a>
              <a
                href="/admin/products/health"
                className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] font-medium transition-colors"
              >
                Product Health
              </a>
              <a
                href="/admin/system"
                className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#FAF8F5] font-medium transition-colors"
              >
                System Status
              </a>
            </div>
          </div>

          {/* Controls: Date Range, Quality, Export, Refresh, Logout */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* Date Range Selector */}
            <div className="flex items-center bg-[#F3EFEA] p-1 rounded-xl border border-[#DDD7CD]">
              {(['today', '7d', '30d', '90d', 'all'] as DateRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
                    dateRange === range
                      ? 'bg-white text-[#1A1A1A] shadow-sm'
                      : 'text-[#666] hover:text-[#1A1A1A]'
                  }`}
                >
                  {range === 'today'
                    ? 'Today'
                    : range === '7d'
                    ? '7D'
                    : range === '30d'
                    ? '30D'
                    : range === '90d'
                    ? '90D'
                    : 'All'}
                </button>
              ))}
            </div>

            {/* Quality Toggle */}
            <button
              onClick={() => setHumanOnly(!humanOnly)}
              title={humanOnly ? 'Showing human/likely-human traffic' : 'Showing all traffic (inc. bots)'}
              className={`px-3 py-1.5 rounded-xl border font-medium flex items-center gap-1.5 transition-all ${
                humanOnly
                  ? 'bg-white border-[#DDD7CD] text-[#2C2A29]'
                  : 'bg-[#FFFBE6] border-[#FFE58F] text-[#D46B08]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{humanOnly ? 'Human Traffic' : 'All Traffic (Bots Inc.)'}</span>
            </button>

            {/* Export Menu */}
            <div className="relative group">
              <button className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD7CD] text-[#2C2A29] hover:bg-[#F8F6F2] font-medium flex items-center gap-1.5 transition-all">
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white border border-[#E8E2D9] rounded-xl shadow-lg py-1 min-w-[150px] z-50">
                <button
                  onClick={() => handleExport('products')}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#333] hover:bg-[#FAF8F5] transition-colors"
                >
                  Products CSV
                </button>
                <button
                  onClick={() => handleExport('daily')}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#333] hover:bg-[#FAF8F5] transition-colors"
                >
                  Daily Trend CSV
                </button>
                <button
                  onClick={() => handleExport('content')}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#333] hover:bg-[#FAF8F5] transition-colors"
                >
                  Reels & Looks CSV
                </button>
                <button
                  onClick={() => handleExport('campaigns')}
                  className="w-full text-left px-3 py-1.5 text-xs text-[#333] hover:bg-[#FAF8F5] transition-colors"
                >
                  Campaigns CSV
                </button>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#F8F6F2] transition-all disabled:opacity-50"
              aria-label="Refresh Dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1A1A1A]' : ''}`} />
            </button>

            {/* Help / Methodology */}
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 rounded-xl bg-white border border-[#DDD7CD] text-[#555] hover:text-[#111] hover:bg-[#F8F6F2] transition-all"
              aria-label="Analytics Definitions"
            >
              <Info className="w-3.5 h-3.5" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white border border-[#DDD7CD] text-[#CF1322] hover:bg-[#FFF1F0] transition-all"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 space-y-6">
        {/* Help & Methodology Drawer (Expandable) */}
        {showHelp && (
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 md:p-6 shadow-sm transition-all animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] mb-4">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#8C827A]" />
                <h2 className="font-serif text-lg text-[#1A1A1A]">Analytics Definitions & Methodology</h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="text-[#888] hover:text-[#222] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#555]">
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
                <strong className="block text-[#2C2A29] mb-1 font-semibold">Visitor & Sessions</strong>
                Distinct privacy-preserving session hashes active on sunidhi.shop during the chosen date range. No PII is stored.
              </div>
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
                <strong className="block text-[#2C2A29] mb-1 font-semibold">Affiliate Click-Through Rate (CTR)</strong>
                Formula: <code className="bg-white px-1 py-0.5 rounded border text-[#1A1A1A] font-mono">Affiliate Clicks / Product Views</code>. Returns 0% cleanly when zero views exist.
              </div>
              <div className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
                <strong className="block text-[#2C2A29] mb-1 font-semibold">Zero Revenue Claim Policy</strong>
                This system strictly tracks website visits, engagement, and outbound merchant redirects. Confirmed purchases, returns, and commissions are handled directly by merchants and are never guessed or falsified.
              </div>
            </div>
          </div>
        )}

        {/* Deterministic Actionable Insights Banner */}
        {overview?.insights && overview.insights.length > 0 && (
          <div className="bg-gradient-to-r from-[#FAF6F0] to-[#F5ECE0] border border-[#E8DEC8] rounded-2xl p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#A87B43]" />
              <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-[#7D5B2F]">
                Creator Intelligence & Recommendations
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {overview.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="bg-white/80 backdrop-blur-sm border border-[#EADBCC] rounded-xl p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <span className="block text-xs font-semibold text-[#2C2A29] mb-1">
                      {insight.title}
                    </span>
                    <p className="text-xs text-[#666] leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                  {insight.metric && (
                    <span className="mt-2 inline-block text-[11px] font-medium text-[#A87B43] bg-[#F7F0E6] px-2 py-0.5 rounded-md self-start">
                      {insight.metric}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overview KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
          {/* Visitors */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs text-[#8C827A] mb-2">
              <span className="uppercase tracking-wider font-medium">Total Visitors</span>
              <Users className="w-4 h-4 text-[#B3A99F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl md:text-3xl font-semibold text-[#1A1A1A]">
                {overview?.totalVisitors ?? 0}
              </span>
              {overview?.periodComparison?.visitorsChangePct !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    (overview?.periodComparison?.visitorsChangePct ?? 0) >= 0
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF1F0] text-[#CF1322]'
                  }`}
                >
                  {(overview?.periodComparison?.visitorsChangePct ?? 0) >= 0 ? '+' : ''}
                  {overview?.periodComparison?.visitorsChangePct}%
                </span>
              )}
            </div>
            <span className="block text-[11px] text-[#999] mt-1.5">
              Unique sessions across pages
            </span>
          </div>

          {/* Product Views */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs text-[#8C827A] mb-2">
              <span className="uppercase tracking-wider font-medium">Product Views</span>
              <Eye className="w-4 h-4 text-[#B3A99F]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl md:text-3xl font-semibold text-[#1A1A1A]">
                {overview?.productViews ?? 0}
              </span>
              {overview?.periodComparison?.viewsChangePct !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    (overview?.periodComparison?.viewsChangePct ?? 0) >= 0
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF1F0] text-[#CF1322]'
                  }`}
                >
                  {(overview?.periodComparison?.viewsChangePct ?? 0) >= 0 ? '+' : ''}
                  {overview?.periodComparison?.viewsChangePct}%
                </span>
              )}
            </div>
            <span className="block text-[11px] text-[#999] mt-1.5">
              Product detail inspections
            </span>
          </div>

          {/* Affiliate Clicks */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs text-[#8C827A] mb-2">
              <span className="uppercase tracking-wider font-medium">Affiliate Clicks</span>
              <MousePointerClick className="w-4 h-4 text-[#A87B43]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl md:text-3xl font-semibold text-[#1A1A1A]">
                {overview?.affiliateClicks ?? 0}
              </span>
              {overview?.periodComparison?.clicksChangePct !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    (overview?.periodComparison?.clicksChangePct ?? 0) >= 0
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF1F0] text-[#CF1322]'
                  }`}
                >
                  {(overview?.periodComparison?.clicksChangePct ?? 0) >= 0 ? '+' : ''}
                  {overview?.periodComparison?.clicksChangePct}%
                </span>
              )}
            </div>
            <span className="block text-[11px] text-[#999] mt-1.5">
              Outbound merchant redirects
            </span>
          </div>

          {/* Affiliate CTR */}
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <div className="flex items-center justify-between text-xs text-[#8C827A] mb-2">
              <span className="uppercase tracking-wider font-medium">Affiliate CTR</span>
              <TrendingUp className="w-4 h-4 text-[#2E7D32]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-2xl md:text-3xl font-semibold text-[#1A1A1A]">
                {overview?.affiliateCtr ?? 0}%
              </span>
              {overview?.periodComparison?.ctrChangePct !== null && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    (overview?.periodComparison?.ctrChangePct ?? 0) >= 0
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-[#FFF1F0] text-[#CF1322]'
                  }`}
                >
                  {(overview?.periodComparison?.ctrChangePct ?? 0) >= 0 ? '+' : ''}
                  {overview?.periodComparison?.ctrChangePct}%
                </span>
              )}
            </div>
            <span className="block text-[11px] text-[#999] mt-1.5">
              Clicks per product view
            </span>
          </div>
        </div>

        {/* Secondary KPIs: Impressions & Lookbook Views */}
        <div className="flex flex-wrap items-center justify-between bg-white border border-[#E8E2D9] rounded-xl px-4 py-2.5 text-xs text-[#666] gap-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#888]" />
              <span>Catalog Impressions: <strong className="text-[#1A1A1A]">{overview?.productImpressions ?? 0}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Film className="w-3.5 h-3.5 text-[#888]" />
              <span>Sunidhi.shop Reel Views: <strong className="text-[#1A1A1A]">{overview?.contentViews ?? 0}</strong></span>
            </div>
          </div>
          <div className="text-[11px] text-[#8C827A]">
            Traffic Filter: {overview?.trafficQuality.humanPercentage ?? 100}% verified human activity
          </div>
        </div>

        {/* Primary Trend Chart */}
        <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#F0EBE1] gap-3">
            <div>
              <h2 className="font-serif text-lg font-normal text-[#1A1A1A]">Shopping Intent Trend</h2>
              <p className="text-xs text-[#888] mt-0.5">
                Daily trajectory of visitor attention, product inspections, and outbound affiliate actions
              </p>
            </div>

            {/* Metric Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-[#FAF8F5] p-1 rounded-xl border border-[#EDE7DD] text-xs">
              <button
                onClick={() => setChartMetric('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartMetric === 'all' ? 'bg-[#1A1A1A] text-white' : 'text-[#666] hover:text-[#111]'
                }`}
              >
                All Metrics
              </button>
              <button
                onClick={() => setChartMetric('clicks')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartMetric === 'clicks' ? 'bg-[#A87B43] text-white' : 'text-[#666] hover:text-[#111]'
                }`}
              >
                Clicks
              </button>
              <button
                onClick={() => setChartMetric('views')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartMetric === 'views' ? 'bg-[#4B6B94] text-white' : 'text-[#666] hover:text-[#111]'
                }`}
              >
                Views
              </button>
              <button
                onClick={() => setChartMetric('visitors')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  chartMetric === 'visitors' ? 'bg-[#5C7866] text-white' : 'text-[#666] hover:text-[#111]'
                }`}
              >
                Visitors
              </button>
            </div>
          </div>

          {/* Lightweight Responsive SVG Chart */}
          <div className="mt-6">
            {overview?.trend && overview.trend.length > 0 ? (
              <div className="w-full h-56 relative flex flex-col justify-end">
                {/* SVG Visual Lines */}
                <svg className="w-full h-44 overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A87B43" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#A87B43" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  <line x1="0" y1="0%" x2="100%" y2="0%" stroke="#F0EBE1" strokeDasharray="3 3" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#F0EBE1" strokeDasharray="3 3" />
                  <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#E8E2D9" />

                  {/* Chart Points Calculation */}
                  {(() => {
                    const trend = overview.trend;
                    const maxVal = Math.max(
                      ...trend.map((t) => Math.max(t.views, t.clicks, t.visitors)),
                      5
                    );
                    const n = trend.length;

                    const getX = (i: number) => (n > 1 ? (i / (n - 1)) * 100 : 50);
                    const getY = (val: number) => 100 - (val / maxVal) * 85;

                    const makePath = (key: 'clicks' | 'views' | 'visitors') => {
                      return trend
                        .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)}% ${getY(pt[key])}%`)
                        .join(' ');
                    };

                    return (
                      <>
                        {/* Views Line */}
                        {(chartMetric === 'all' || chartMetric === 'views') && (
                          <path
                            d={makePath('views')}
                            fill="none"
                            stroke="#4B6B94"
                            strokeWidth="2"
                            className="transition-all duration-300"
                          />
                        )}

                        {/* Visitors Line */}
                        {(chartMetric === 'all' || chartMetric === 'visitors') && (
                          <path
                            d={makePath('visitors')}
                            fill="none"
                            stroke="#5C7866"
                            strokeWidth="2"
                            strokeDasharray="4 2"
                            className="transition-all duration-300"
                          />
                        )}

                        {/* Clicks Line (Hero) */}
                        {(chartMetric === 'all' || chartMetric === 'clicks') && (
                          <>
                            <path
                              d={`${makePath('clicks')} L 100% 100% L 0% 100% Z`}
                              fill="url(#clicksGrad)"
                              className="transition-all duration-300"
                            />
                            <path
                              d={makePath('clicks')}
                              fill="none"
                              stroke="#A87B43"
                              strokeWidth="2.5"
                              className="transition-all duration-300"
                            />
                            {trend.map((pt, i) => (
                              <circle
                                key={`c-${i}`}
                                cx={`${getX(i)}%`}
                                cy={`${getY(pt.clicks)}%`}
                                r="3.5"
                                fill="#A87B43"
                                stroke="#FFFFFF"
                                strokeWidth="2"
                              />
                            ))}
                          </>
                        )}
                      </>
                    );
                  })()}
                </svg>

                {/* X Axis Dates */}
                <div className="flex justify-between items-center pt-3 text-[10px] text-[#8C827A] border-t border-[#F0EBE1] mt-2">
                  {overview.trend.map((t, idx) => {
                    // Show dates evenly spaced
                    const show =
                      overview.trend.length <= 7 ||
                      idx === 0 ||
                      idx === overview.trend.length - 1 ||
                      idx % Math.ceil(overview.trend.length / 5) === 0;
                    return (
                      <span key={t.date} className={show ? 'block' : 'hidden md:block'}>
                        {t.date.slice(5)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-[#999] bg-[#FAF8F5] rounded-xl border border-dashed border-[#DDD7CD]">
                No trend events recorded in this date range.
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <span className="flex items-center gap-1.5 text-[#A87B43]">
                <span className="w-3 h-0.5 bg-[#A87B43] rounded" />
                Affiliate Clicks
              </span>
              <span className="flex items-center gap-1.5 text-[#4B6B94]">
                <span className="w-3 h-0.5 bg-[#4B6B94] rounded" />
                Product Views
              </span>
              <span className="flex items-center gap-1.5 text-[#5C7866]">
                <span className="w-3 h-0.5 bg-[#5C7866] border-b border-dashed" />
                Visitors
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center border-b border-[#E8E2D9] gap-2 md:gap-4 overflow-x-auto pb-1 text-sm">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === 'products'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#777] hover:text-[#111]'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Product Performance</span>
            <span className="bg-[#EAE5DE] text-[#2C2A29] text-[10px] px-1.5 py-0.2 rounded-full font-semibold">
              {productsData?.products.length ?? 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('content')}
            className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#777] hover:text-[#111]'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Reels & Campaigns</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#777] hover:text-[#111]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Categories & Stores</span>
          </button>

          <button
            onClick={() => setActiveTab('sources')}
            className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === 'sources'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#777] hover:text-[#111]'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Channels & UTMs</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-1 font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'border-[#1A1A1A] text-[#1A1A1A]'
                : 'border-transparent text-[#777] hover:text-[#111]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Live Feed</span>
          </button>
        </div>

        {/* TAB 1: PRODUCT PERFORMANCE */}
        {activeTab === 'products' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Spotlights: High Intent vs Underperforming */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* High Interest Picks */}
              <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                    <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">
                      High-Interest Picks
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#8C827A]">High views + high CTR</span>
                </div>
                {productsData?.highIntentProducts && productsData.highIntentProducts.length > 0 ? (
                  <div className="space-y-2.5">
                    {productsData.highIntentProducts.map((p) => (
                      <div
                        key={p.productId}
                        onClick={() => openProductDetail(p.productSlug)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FAF8F5] cursor-pointer transition-colors border border-transparent hover:border-[#E8E2D9]"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs font-semibold text-[#1A1A1A] truncate">
                            {p.title}
                          </span>
                          <span className="text-[11px] text-[#888]">
                            {p.brand} • {p.store}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-xs font-semibold text-[#2E7D32]">
                            {p.clicks} clicks ({p.ctr}% CTR)
                          </span>
                          <span className="text-[10px] text-[#999]">{p.views} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#999] py-4 text-center">
                    No high-intent thresholds met yet in this period.
                  </p>
                )}
              </div>

              {/* Underperforming Products Alert */}
              <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D46B08]" />
                    <h3 className="font-serif text-base font-semibold text-[#1A1A1A]">
                      Underperforming Products
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#8C827A]">High views, zero/low clicks</span>
                </div>
                {productsData?.underperformingProducts && productsData.underperformingProducts.length > 0 ? (
                  <div className="space-y-2.5">
                    {productsData.underperformingProducts.map((p) => (
                      <div
                        key={p.productId}
                        onClick={() => openProductDetail(p.productSlug)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#FFFBF6] cursor-pointer transition-colors border border-transparent hover:border-[#FCE4D6]"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="block text-xs font-semibold text-[#1A1A1A] truncate">
                            {p.title}
                          </span>
                          <span className="text-[11px] text-[#888]">
                            {p.category} • {p.store}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="block text-xs font-semibold text-[#CF1322]">
                            {p.clicks} clicks
                          </span>
                          <span className="text-[10px] text-[#888]">{p.views} views ({p.impressions} impr.)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#999] py-4 text-center">
                    No underperforming products detected in this period.
                  </p>
                )}
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#999] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products or brands..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1A1A1A] placeholder-[#888] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                />
              </div>

              {/* Filters & Sorting */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
                {/* Category Dropdown */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl px-3 py-2 text-[#333] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Store Dropdown */}
                <select
                  value={storeFilter}
                  onChange={(e) => setStoreFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl px-3 py-2 text-[#333] focus:outline-none"
                >
                  <option value="all">All Stores</option>
                  {availableStores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-[#FAF8F5] border border-[#DDD7CD] rounded-xl px-3 py-2 text-[#333] font-medium focus:outline-none"
                >
                  <option value="clicks">Sort by: Clicks</option>
                  <option value="views">Sort by: Views</option>
                  <option value="ctr">Sort by: CTR (%)</option>
                </select>
              </div>
            </div>

            {/* Master Product Performance Table */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Store</th>
                      <th className="py-3.5 px-4 text-right">Views</th>
                      <th className="py-3.5 px-4 text-right">Affiliate Clicks</th>
                      <th className="py-3.5 px-4 text-right">CTR</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p) => (
                        <tr
                          key={p.productId}
                          className="hover:bg-[#FAF8F5] transition-colors cursor-pointer group"
                          onClick={() => openProductDetail(p.productSlug)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="font-semibold text-[#1A1A1A] block group-hover:text-[#A87B43] transition-colors">
                                  {p.title}
                                </span>
                                <span className="text-[11px] text-[#888]">
                                  {p.brand} • ₹{p.price.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[#555]">{p.category}</td>
                          <td className="py-3.5 px-4 text-[#555]">{p.store}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#1A1A1A]">
                            {p.views}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#A87B43]">
                            {p.clicks}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#2E7D32]">
                            {p.ctr}%
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                p.status === 'active'
                                  ? 'bg-[#E8F5E9] text-[#2E7D32]'
                                  : 'bg-[#F5F5F5] text-[#777]'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <ChevronRight className="w-4 h-4 text-[#CCC] group-hover:text-[#1A1A1A] inline-block transition-colors" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-[#888]">
                          No products found matching your search and filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REELS & CAMPAIGNS */}
        {activeTab === 'content' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Creator Content Table */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl shadow-sm p-5">
              <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                <h3 className="font-serif text-lg text-[#1A1A1A]">Creator Content & Reel Lookbooks</h3>
                <p className="text-xs text-[#888] mt-0.5">
                  Internal Sunidhi.shop traffic driven by specific Instagram Reels and Lookbooks
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Content / Look</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Sunidhi.shop Views</th>
                      <th className="py-3 px-4 text-right">Product Clicks</th>
                      <th className="py-3 px-4 text-right">Outbound Clicks</th>
                      <th className="py-3 px-4">Top Linked Products</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {content.length > 0 ? (
                      content.map((c) => (
                        <tr key={c.contentId} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-[#1A1A1A] block">{c.title}</span>
                            <span className="text-[10px] text-[#888] font-mono">{c.contentId}</span>
                          </td>
                          <td className="py-3.5 px-4 uppercase text-[10px] text-[#666] font-medium">
                            {c.contentType}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#1A1A1A]">
                            {c.views}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#555]">{c.productClicks}</td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#A87B43]">
                            {c.affiliateClicks}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {c.topProducts.map((p) => (
                                <span
                                  key={p.slug}
                                  className="text-[10px] bg-[#FAF8F5] border border-[#DDD7CD] px-1.5 py-0.5 rounded text-[#444]"
                                >
                                  {p.slug.replace(/-/g, ' ')} ({p.clicks})
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#888]">
                          No creator content activity recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaign Performance Table */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl shadow-sm p-5">
              <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                <h3 className="font-serif text-lg text-[#1A1A1A]">Curated Campaigns</h3>
                <p className="text-xs text-[#888] mt-0.5">
                  Performance of seasonal collections and promotional campaigns
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Campaign</th>
                      <th className="py-3 px-4 text-right">Landing Views</th>
                      <th className="py-3 px-4 text-right">Product Views</th>
                      <th className="py-3 px-4 text-right">Affiliate Clicks</th>
                      <th className="py-3 px-4 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {campaigns.length > 0 ? (
                      campaigns.map((camp) => (
                        <tr key={camp.campaignId} className="hover:bg-[#FAF8F5]">
                          <td className="py-3.5 px-4 font-semibold text-[#1A1A1A]">{camp.name}</td>
                          <td className="py-3.5 px-4 text-right">{camp.views}</td>
                          <td className="py-3.5 px-4 text-right">{camp.productViews}</td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#A87B43]">
                            {camp.affiliateClicks}
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#2E7D32]">
                            {camp.ctr}%
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#888]">
                          No campaign activity recorded in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CATEGORIES & MERCHANTS */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
            {/* Categories */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
              <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                <h3 className="font-serif text-lg text-[#1A1A1A]">Category Performance</h3>
                <p className="text-xs text-[#888] mt-0.5">Which product departments generate the highest interest</p>
              </div>
              <div className="space-y-4">
                {categories.map((c) => (
                  <div key={c.category} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1A1A1A] font-semibold">{c.category}</span>
                      <span className="text-[#666]">
                        {c.clicks} clicks • {c.ctr}% CTR • {c.shareOfClicks}% share
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#F3EFEA] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#A87B43] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(c.shareOfClicks, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Merchant Destination Breakdown */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
              <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                <h3 className="font-serif text-lg text-[#1A1A1A]">Merchant Traffic Share</h3>
                <p className="text-xs text-[#888] mt-0.5">Where Sunidhi shoppers are redirected to purchase</p>
              </div>
              <div className="space-y-4">
                {merchants.map((m) => (
                  <div key={m.merchant} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#1A1A1A] font-semibold">{m.merchant}</span>
                      <span className="text-[#666]">
                        {m.totalClicks} clicks ({m.shareOfClicks}%) • {m.uniqueSessions} shoppers
                      </span>
                    </div>
                    <div className="w-full bg-[#F3EFEA] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#4B6B94] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(m.shareOfClicks, 3)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHANNELS, UTMS & DEVICES */}
        {activeTab === 'sources' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Device breakdown cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {devices.map((d) => (
                <div key={d.deviceType} className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#8C827A] mb-3">
                    <span className="uppercase tracking-wider font-semibold capitalize">{d.deviceType}</span>
                    <Smartphone className="w-4 h-4 text-[#A87B43]" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-2xl font-semibold text-[#1A1A1A]">
                      {d.clicks} clicks
                    </span>
                    <span className="text-xs font-medium text-[#2E7D32]">
                      ({d.shareOfClicks}% share)
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F0EBE1] flex justify-between text-xs text-[#666]">
                    <span>Visitors: {d.visitors}</span>
                    <span>CTR: {d.ctr}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Traffic Channels */}
            <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
              <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                <h3 className="font-serif text-lg text-[#1A1A1A]">Acquisition Channels</h3>
                <p className="text-xs text-[#888] mt-0.5">Visitor referrers and social origins</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Channel / Referrer</th>
                      <th className="py-3 px-4 text-right">Visitors</th>
                      <th className="py-3 px-4 text-right">Product Views</th>
                      <th className="py-3 px-4 text-right">Affiliate Clicks</th>
                      <th className="py-3 px-4 text-right">Conversion (CTR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EBE1]">
                    {sources.map((s) => (
                      <tr key={s.source} className="hover:bg-[#FAF8F5]">
                        <td className="py-3.5 px-4 font-semibold text-[#1A1A1A]">{s.source}</td>
                        <td className="py-3.5 px-4 text-right">{s.visitors}</td>
                        <td className="py-3.5 px-4 text-right">{s.views}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#A87B43]">{s.clicks}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#2E7D32]">{s.ctr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* UTM Campaigns Table */}
            {utms.length > 0 && (
              <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm">
                <div className="pb-3 border-b border-[#F0EBE1] mb-4">
                  <h3 className="font-serif text-lg text-[#1A1A1A]">UTM Attribution Details</h3>
                  <p className="text-xs text-[#888] mt-0.5">Campaign tags appended to inbound links</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#8C827A] border-b border-[#E8E2D9] uppercase tracking-wider font-semibold text-[10px]">
                      <tr>
                        <th className="py-3 px-4">UTM Source</th>
                        <th className="py-3 px-4">Campaign</th>
                        <th className="py-3 px-4">Medium / Content</th>
                        <th className="py-3 px-4 text-right">Visitors</th>
                        <th className="py-3 px-4 text-right">Affiliate Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE1]">
                      {utms.map((u, i) => (
                        <tr key={i} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 px-4 font-medium text-[#1A1A1A]">{u.utmSource || '-'}</td>
                          <td className="py-3 px-4 text-[#555]">{u.utmCampaign || '-'}</td>
                          <td className="py-3 px-4 text-[#777]">{u.utmMedium || u.utmContent || '-'}</td>
                          <td className="py-3 px-4 text-right">{u.visitors}</td>
                          <td className="py-3 px-4 text-right font-semibold text-[#A87B43]">{u.clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RECENT ACTIVITY FEED */}
        {activeTab === 'activity' && (
          <div className="bg-white border border-[#E8E2D9] rounded-2xl p-5 shadow-sm animate-in fade-in duration-200">
            <div className="pb-3 border-b border-[#F0EBE1] mb-4">
              <h3 className="font-serif text-lg text-[#1A1A1A]">Real-Time Storefront Telemetry</h3>
              <p className="text-xs text-[#888] mt-0.5">
                Last 50 recorded shopper actions (zero PII, fully anonymized)
              </p>
            </div>
            <div className="divide-y divide-[#F0EBE1]">
              {recentActivity.length > 0 ? (
                recentActivity.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.eventType.includes('Click')
                            ? 'bg-[#A87B43]'
                            : item.eventType.includes('View')
                            ? 'bg-[#4B6B94]'
                            : 'bg-[#5C7866]'
                        }`}
                      />
                      <div>
                        <span className="font-semibold text-[#1A1A1A]">
                          {item.eventType}
                        </span>
                        {item.productTitle && (
                          <span className="text-[#555] ml-1.5 font-medium">
                            • {item.productTitle}
                          </span>
                        )}
                        <span className="text-[#888] block text-[11px]">
                          via {item.source} {item.merchant ? `→ ${item.merchant}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#8C827A]">
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="block text-[10px] text-[#BBB]">
                        {item.trafficType === 'bot' ? 'Bot' : 'Human'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-xs text-[#888]">
                  No recent activities recorded yet.
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProductSlug && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E2D9] rounded-2xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between pb-4 border-b border-[#F0EBE1]">
              <div>
                <span className="text-xs uppercase tracking-wider text-[#8C827A] font-semibold">
                  Product Intelligence Drill-Down
                </span>
                <h3 className="font-serif text-xl font-normal text-[#1A1A1A] mt-1">
                  {productDetail?.product?.title || selectedProductSlug.replace(/-/g, ' ')}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedProductSlug(null);
                  setProductDetail(null);
                }}
                className="p-1 rounded-lg text-[#888] hover:text-[#111] hover:bg-[#FAF8F5]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-12 text-center text-xs text-[#888]">
                Loading product analytics...
              </div>
            ) : productDetail ? (
              <div className="py-4 space-y-4 text-xs">
                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-3 bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EDE7DD]">
                  <div>
                    <span className="text-[#888] block text-[10px] uppercase">Views</span>
                    <strong className="text-lg font-serif text-[#1A1A1A]">{productDetail.views}</strong>
                  </div>
                  <div>
                    <span className="text-[#888] block text-[10px] uppercase">Affiliate Clicks</span>
                    <strong className="text-lg font-serif text-[#A87B43]">{productDetail.clicks}</strong>
                  </div>
                  <div>
                    <span className="text-[#888] block text-[10px] uppercase">CTR</span>
                    <strong className="text-lg font-serif text-[#2E7D32]">{productDetail.ctr}%</strong>
                  </div>
                </div>

                {/* Top Sources */}
                {productDetail.topSources && productDetail.topSources.length > 0 && (
                  <div>
                    <span className="block font-semibold text-[#333] mb-1.5">Top Traffic Sources</span>
                    <div className="flex flex-wrap gap-1.5">
                      {productDetail.topSources.map((s: any) => (
                        <span
                          key={s.source}
                          className="bg-[#F5F2EC] px-2 py-1 rounded text-[#444] text-[11px]"
                        >
                          {s.source}: {s.count} clicks
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Content */}
                {productDetail.topContent && productDetail.topContent.length > 0 && (
                  <div>
                    <span className="block font-semibold text-[#333] mb-1.5">Associated Creator Reels</span>
                    <div className="flex flex-wrap gap-1.5">
                      {productDetail.topContent.map((c: any) => (
                        <span
                          key={c.contentId}
                          className="bg-[#F5F2EC] px-2 py-1 rounded text-[#444] text-[11px]"
                        >
                          {c.contentId}: {c.count} clicks
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Link to Storefront */}
                <div className="pt-2 flex justify-end">
                  <a
                    href={`/product/${selectedProductSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#A87B43] hover:underline font-medium"
                  >
                    <span>View Public Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
