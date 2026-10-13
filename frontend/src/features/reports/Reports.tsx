import { useEffect, useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  IndianRupee,
  Receipt,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
} from "lucide-react";
import {
  getReportSummary,
  getDailySales,
  getMonthlyRevenue,
  getMetalSplit,
  getTopCustomers,
  getStaffPerformance,
  getMonthlyGst,
  type ReportSummary,
  type DailySales,
  type MonthlyRevenue,
  type MetalSplit,
  type TopCustomer,
  type StaffPerf,
} from "./reports.service";

import {
  getInventorySummary,
  getMovementTrend,
  getTopMovingItems,
  type InventorySummary,
  type MovementTrend,
  type TopMovingItem,
} from "../inventory/inventory.service";

import {
  FORECAST_COLOR,
  FORECAST_DAYS,
  FORECAST_MONTHS,
  futureDayLabels,
  futureMonthKeys,
  projectNextValues,
} from "./forecast.utils";

const PIE_COLORS = ["#B08D57", "#71717A", "#D4A843", "#52525B", "#E8DFD0"];
const GOLD = "#B08D57";
const FORECAST_BAR_FILL = "#D9D1FF";

interface DailyChartRow {
  date: string;
  revenue: number | null;
  invoices: number | null;
  forecastRevenue: number | null;
  forecastInvoices: number | null;
}

interface MonthlyChartRow {
  month: string;
  revenue: number | null;
  forecastRevenue: number | null;
}

interface GstChartRow {
  month: string;
  gst: number | null;
  forecastGst: number | null;
}

interface MovementChartRow {
  date: string;
  in_qty: number | null;
  out_qty: number | null;
  adj_qty: number | null;
  net_qty: number | null;
  forecastNet: number | null;
}

function formatINR(n: number) {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[#E4E4E7] bg-white ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, label, title }: { icon: React.ReactNode; label: string; title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#E4E4E7] px-5 py-4">
      <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">{icon}</div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-[#71717A]">{label}</p>
        <h2 className="font-semibold text-[#18181B]">{title}</h2>
      </div>
    </div>
  );
}

function ChartLegend({ actualLabel }: { actualLabel: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#B08D57]" />
        {actualLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed"
          style={{ backgroundColor: FORECAST_BAR_FILL, borderColor: FORECAST_COLOR }}
        />
        Forecast baseline*
      </span>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [metalSplit, setMetalSplit] = useState<MetalSplit[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([]);
  const [monthlyGst, setMonthlyGst] = useState<{ month: string; gst: number }[]>([]);

  const [invSummary, setInvSummary] = useState<InventorySummary | null>(null);
  const [movementTrend, setMovementTrend] = useState<MovementTrend[]>([]);
  const [topMovers, setTopMovers] = useState<TopMovingItem[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [s, d, m, metal, tc, sp, gst, invS, mvTrend, topMv] = await Promise.all([
        getReportSummary(),
        getDailySales(30),
        getMonthlyRevenue(12),
        getMetalSplit(),
        getTopCustomers(10),
        getStaffPerformance(),
        getMonthlyGst(12),
        getInventorySummary(),
        getMovementTrend(30),
        getTopMovingItems(10),
      ]);

      setSummary(s);
      setDailySales(d);
      setMonthlyRevenue(m);
      setMetalSplit(metal);
      setTopCustomers(tc);
      setStaffPerf(sp);
      setMonthlyGst(gst);
      setInvSummary(invS);
      setMovementTrend(mvTrend);
      setTopMovers(topMv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dailyForecast = useMemo(() => {
    const revenueForecast = projectNextValues(
      dailySales.map((entry) => entry.revenue),
      FORECAST_DAYS,
    );
    const invoiceForecast = projectNextValues(
      dailySales.map((entry) => entry.invoices),
      FORECAST_DAYS,
    ).map((value) => Math.round(value));
    const futureLabels = futureDayLabels(FORECAST_DAYS);

    const rows: DailyChartRow[] = [
      ...dailySales.map((entry) => ({
        date: entry.date,
        revenue: entry.revenue,
        invoices: entry.invoices,
        forecastRevenue: null,
        forecastInvoices: null,
      })),
      ...futureLabels.map((date, index) => ({
        date: `${date}*`,
        revenue: null,
        invoices: null,
        forecastRevenue: revenueForecast[index] ?? 0,
        forecastInvoices: invoiceForecast[index] ?? 0,
      })),
    ];

    return {
      rows,
      nextRevenueTotal: revenueForecast.reduce((total, value) => total + value, 0),
      nextInvoiceTotal: invoiceForecast.reduce((total, value) => total + value, 0),
    };
  }, [dailySales]);

  const monthlyForecast = useMemo(() => {
    const revenueForecast = projectNextValues(
      monthlyRevenue.map((entry) => entry.revenue),
      FORECAST_MONTHS,
    );
    const futureLabels = futureMonthKeys(FORECAST_MONTHS);
    const lastActual = monthlyRevenue[monthlyRevenue.length - 1];

    const rows: MonthlyChartRow[] = [
      ...monthlyRevenue.map((entry) => ({
        month: entry.month,
        revenue: entry.revenue,
        forecastRevenue: null,
      })),
      ...(lastActual
        ? [
            {
              month: lastActual.month,
              revenue: null,
              forecastRevenue: lastActual.revenue,
            },
          ]
        : []),
      ...futureLabels.map((month, index) => ({
        month: `${month}*`,
        revenue: null,
        forecastRevenue: revenueForecast[index] ?? 0,
      })),
    ];

    return {
      rows,
      nextRevenueTotal: revenueForecast.reduce((total, value) => total + value, 0),
    };
  }, [monthlyRevenue]);

  const gstForecast = useMemo(() => {
    const gstValues = projectNextValues(
      monthlyGst.map((entry) => entry.gst),
      FORECAST_MONTHS,
    );
    const futureLabels = futureMonthKeys(FORECAST_MONTHS);
    const lastActual = monthlyGst[monthlyGst.length - 1];

    const rows: GstChartRow[] = [
      ...monthlyGst.map((entry) => ({
        month: entry.month,
        gst: entry.gst,
        forecastGst: null,
      })),
      ...(lastActual
        ? [
            {
              month: lastActual.month,
              gst: null,
              forecastGst: lastActual.gst,
            },
          ]
        : []),
      ...futureLabels.map((month, index) => ({
        month: `${month}*`,
        gst: null,
        forecastGst: gstValues[index] ?? 0,
      })),
    ];

    return {
      rows,
      nextGstTotal: gstValues.reduce((total, value) => total + value, 0),
    };
  }, [monthlyGst]);

  const movementForecast = useMemo(() => {
    const netForecast = projectNextValues(
      movementTrend.map((entry) => entry.net_qty),
      FORECAST_DAYS,
      { minimum: null, round: false },
    );
    const futureLabels = futureDayLabels(FORECAST_DAYS);
    const lastActual = movementTrend[movementTrend.length - 1];

    const rows: MovementChartRow[] = [
      ...movementTrend.map((entry) => ({
        date: entry.date,
        in_qty: entry.in_qty,
        out_qty: entry.out_qty,
        adj_qty: entry.adj_qty,
        net_qty: entry.net_qty,
        forecastNet: null,
      })),
      ...(lastActual
        ? [
            {
              date: lastActual.date,
              in_qty: null,
              out_qty: null,
              adj_qty: null,
              net_qty: null,
              forecastNet: lastActual.net_qty,
            },
          ]
        : []),
      ...futureLabels.map((date, index) => ({
        date: `${date}*`,
        in_qty: null,
        out_qty: null,
        adj_qty: null,
        net_qty: null,
        forecastNet: netForecast[index] ?? 0,
      })),
    ];

    return {
      rows,
      nextNetTotal: netForecast.reduce((total, value) => total + value, 0),
    };
  }, [movementTrend]);

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-[#71717A]">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <IndianRupee size={18} />
              </div>
              <div>
                <p className="text-xs text-[#71717A]">Total Revenue (6m)</p>
                <p className="text-lg font-bold text-[#18181B]">
                  ₹{formatINR(summary.totalRevenue)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <Receipt size={18} />
              </div>
              <div>
                <p className="text-xs text-[#71717A]">Total Invoices (6m)</p>
                <p className="text-lg font-bold text-[#18181B]">{summary.totalInvoices}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-xs text-[#71717A]">Avg Invoice Value</p>
                <p className="text-lg font-bold text-[#18181B]">
                  ₹{formatINR(Math.round(summary.avgInvoiceValue))}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                <Users size={18} />
              </div>
              <div>
                <p className="text-xs text-[#71717A]">Total Customers</p>
                <p className="text-lg font-bold text-[#18181B]">{summary.totalCustomers}</p>
              </div>
            </div>
          </Card>
        </section>
      )}

      {(dailySales.some((entry) => entry.revenue > 0) ||
        monthlyRevenue.some((entry) => entry.revenue > 0) ||
        monthlyGst.some((entry) => entry.gst > 0) ||
        movementTrend.some((entry) => entry.in_qty > 0 || entry.out_qty > 0)) && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-5">
            <p className="text-xs text-[#71717A]">Projected Revenue (7d)</p>
            <p className="mt-1 text-lg font-bold text-[#18181B]">
              ₹{formatINR(dailyForecast.nextRevenueTotal)}
            </p>
            <p className="mt-1 text-xs text-[#71717A]">Linear-trend baseline</p>
          </Card>

          <Card className="p-5">
            <p className="text-xs text-[#71717A]">Projected Invoices (7d)</p>
            <p className="mt-1 text-lg font-bold text-[#18181B]">
              {dailyForecast.nextInvoiceTotal.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-[#71717A]">Linear-trend baseline</p>
          </Card>

          <Card className="p-5">
            <p className="text-xs text-[#71717A]">Projected Revenue (3m)</p>
            <p className="mt-1 text-lg font-bold text-[#18181B]">
              ₹{formatINR(monthlyForecast.nextRevenueTotal)}
            </p>
            <p className="mt-1 text-xs text-[#71717A]">Linear-trend baseline</p>
          </Card>

          <Card className="p-5">
            <p className="text-xs text-[#71717A]">Projected GST (3m)</p>
            <p className="mt-1 text-lg font-bold text-[#18181B]">
              ₹{formatINR(gstForecast.nextGstTotal)}
            </p>
            <p className="mt-1 text-xs text-[#71717A]">Linear-trend baseline</p>
          </Card>

          <Card className="p-5">
            <p className="text-xs text-[#71717A]">Projected Net Stock (7d)</p>
            <p className="mt-1 text-lg font-bold text-[#18181B]">
              {movementForecast.nextNetTotal.toLocaleString("en-IN")} units
            </p>
            <p className="mt-1 text-xs text-[#71717A]">IN − OUT + adjustments</p>
          </Card>
        </section>
      )}

      {/* Daily sales bar chart */}
      <Card>
        <SectionTitle
          icon={<IndianRupee size={18} />}
          label="Daily Trend"
          title="Daily Sales (Last 30 Days + Next 7 Forecast)"
        />
        <div className="p-5">
          <ChartLegend actualLabel="Actual revenue" />
          {dailySales.some((d) => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyForecast.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#71717A" }}
                  interval={Math.floor(dailyForecast.rows.length / 9)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => formatINR(v)} />
                <Tooltip
                  formatter={(value, name) => [
                    `₹${Number(value ?? 0).toLocaleString("en-IN")}`,
                    name === "forecastRevenue" ? "Forecast revenue" : "Actual revenue",
                  ]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                />
                <Bar dataKey="revenue" name="Actual revenue" fill={GOLD} radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="forecastRevenue"
                  name="Forecast revenue"
                  fill={FORECAST_BAR_FILL}
                  stroke={FORECAST_COLOR}
                  strokeWidth={1}
                  strokeDasharray="5 4"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-sm text-[#71717A]">No sales data for the last 30 days.</p>
          )}
        </div>
      </Card>

      {/* Two-column: Monthly Revenue + Monthly GST */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle
            icon={<TrendingUp size={18} />}
            label="Monthly"
            title="Revenue Trend (12 Months + Next 3 Forecast)"
          />
          <div className="p-5">
            <ChartLegend actualLabel="Actual revenue" />
            {monthlyRevenue.some((m) => m.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyForecast.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => formatINR(v)} />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value ?? 0).toLocaleString("en-IN")}`,
                      name === "forecastRevenue" ? "Forecast revenue" : "Actual revenue",
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Actual revenue"
                    stroke={GOLD}
                    strokeWidth={2}
                    dot={{ fill: GOLD, r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="forecastRevenue"
                    name="Forecast revenue"
                    stroke={FORECAST_COLOR}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={{ fill: FORECAST_COLOR, r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No revenue data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle
            icon={<IndianRupee size={18} />}
            label="Tax"
            title="Monthly GST Collected (12 Months + Next 3 Forecast)"
          />
          <div className="p-5">
            <ChartLegend actualLabel="Actual GST" />
            {monthlyGst.some((g) => g.gst > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gstForecast.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => formatINR(v)} />
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value ?? 0).toLocaleString("en-IN")}`,
                      name === "forecastGst" ? "Forecast GST" : "Actual GST",
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                  <Bar dataKey="gst" name="Actual GST" fill="#71717A" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="forecastGst"
                    name="Forecast GST"
                    fill={FORECAST_BAR_FILL}
                    stroke={FORECAST_COLOR}
                    strokeWidth={1}
                    strokeDasharray="5 4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No GST data yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Two-column: Metal Split + Invoice Count */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle
            icon={<Receipt size={18} />}
            label="Breakdown"
            title="Sales by Metal Type"
          />
          <div className="p-5">
            {metalSplit.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={metalSplit}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="revenue"
                    nameKey="metal"
                    label={({ metal, percent }: { metal?: string; percent?: number }) =>
                    `${metal ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  >
                    {metalSplit.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No item data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle
            icon={<Receipt size={18} />}
            label="Volume"
            title="Invoice Count by Day (30 Days + Next 7 Forecast)"
          />
          <div className="p-5">
            <ChartLegend actualLabel="Actual invoices" />
            {dailySales.some((d) => d.invoices > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyForecast.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#71717A" }}
                    interval={Math.floor(dailyForecast.rows.length / 9)}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value ?? 0),
                      name === "forecastInvoices" ? "Forecast invoices" : "Actual invoices",
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                  <Bar dataKey="invoices" name="Actual invoices" fill="#D4A843" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="forecastInvoices"
                    name="Forecast invoices"
                    fill={FORECAST_BAR_FILL}
                    stroke={FORECAST_COLOR}
                    strokeWidth={1}
                    strokeDasharray="5 4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No invoices in the last 30 days.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Two-column: Top Customers + Staff Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle
            icon={<Users size={18} />}
            label="Customers"
            title="Top 10 Customers by Revenue"
          />
          <div className="p-5">
            {topCustomers.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => formatINR(v)} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#71717A" }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill={GOLD} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No customer data yet.</p>
            )}
          </div>
        </Card>

        <Card>
          <SectionTitle
            icon={<TrendingUp size={18} />}
            label="Team"
            title="Staff Performance"
          />
          <div className="p-5">
            {staffPerf.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={staffPerf}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#71717A" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#71717A" }} tickFormatter={(v) => formatINR(v)} />
                  <Tooltip
                    formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Revenue"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#52525B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-sm text-[#71717A]">No staff data yet.</p>
            )}
          </div>
        </Card>
      </div>

      {/* Summary table */}
      {summary && (summary.totalGst > 0 || summary.totalDiscount > 0) && (
        <Card>
          <SectionTitle
            icon={<IndianRupee size={18} />}
            label="Financial Summary"
            title="Last 6 Months Overview"
          />
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[#E4E4E7] p-4">
                <p className="text-xs text-[#71717A]">Total GST Collected</p>
                <p className="mt-1 text-lg font-bold text-[#18181B]">
                  ₹{summary.totalGst.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-[#E4E4E7] p-4">
                <p className="text-xs text-[#71717A]">Total Discounts Given</p>
                <p className="mt-1 text-lg font-bold text-[#18181B]">
                  ₹{summary.totalDiscount.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-lg border border-[#E4E4E7] p-4">
                <p className="text-xs text-[#71717A]">Net Revenue (after discount)</p>
                <p className="mt-1 text-lg font-bold text-[#18181B]">
                  ₹{formatINR(summary.totalRevenue - summary.totalDiscount)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Inventory Section */}
      {invSummary && (
        <>
          {/* Inventory Summary Cards */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-xs text-[#71717A]">Total Items</p>
                  <p className="text-xl font-bold text-[#18181B]">{invSummary.total_items}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <Package size={18} />
                </div>
                <div>
                  <p className="text-xs text-[#71717A]">Total Stock Qty</p>
                  <p className="text-xl font-bold text-[#18181B]">{invSummary.total_stock_qty}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <p className="text-xs text-[#71717A]">Stock Value</p>
                  <p className="text-xl font-bold text-[#18181B]">₹{formatINR(invSummary.total_stock_value)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F5EFE6] p-2 text-[#B08D57]">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-xs text-[#71717A]">Low Stock Items</p>
                  <p className="text-xl font-bold text-[#18181B]">{invSummary.low_stock_count}</p>
                  <p className="text-xs text-[#71717A]">{invSummary.out_of_stock_count} out of stock</p>
                </div>
              </div>
            </Card>
          </section>

          {/* Two-column: Value by Category + Value by Metal */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle
                icon={<Package size={18} />}
                label="Breakdown"
                title="Stock Value by Category"
              />
              <div className="p-5">
                {invSummary.by_category.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={invSummary.by_category}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="stock_value"
                        nameKey="category"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {invSummary.by_category.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Value"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-[#71717A]">No category data yet.</p>
                )}
              </div>
            </Card>

            <Card>
              <SectionTitle
                icon={<Package size={18} />}
                label="Breakdown"
                title="Stock Value by Metal"
              />
              <div className="p-5">
                {invSummary.by_metal.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={invSummary.by_metal}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="stock_value"
                        nameKey="metal_type"
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {invSummary.by_metal.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [`₹${Number(v ?? 0).toLocaleString("en-IN")}`, "Value"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-[#71717A]">No metal data yet.</p>
                )}
              </div>
            </Card>
          </div>

          {/* Movement Trend + Top Moving Items */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle
                icon={<TrendingUp size={18} />}
                label="Movement"
                title="Stock Movement Trend (30 Days + Next 7 Forecast)"
              />
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#3B82F6]" />
                    Actual net
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed"
                      style={{ backgroundColor: FORECAST_BAR_FILL, borderColor: FORECAST_COLOR }}
                    />
                    Forecast net*
                  </span>
                </div>
                {movementTrend.some((m) => m.in_qty > 0 || m.out_qty > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={movementForecast.rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#71717A" }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, name) => [
                          Number(value ?? 0),
                          name === "forecastNet" ? "Forecast net" : name,
                        ]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="in_qty" stroke="#22C55E" strokeWidth={2} dot={{ fill: "#22C55E", r: 3 }} name="IN" connectNulls />
                      <Line type="monotone" dataKey="out_qty" stroke="#EF4444" strokeWidth={2} dot={{ fill: "#EF4444", r: 3 }} name="OUT" connectNulls />
                      <Line type="monotone" dataKey="adj_qty" stroke="#F59E0B" strokeWidth={2} dot={{ fill: "#F59E0B", r: 3 }} name="ADJ" connectNulls />
                      <Line type="monotone" dataKey="net_qty" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 3 }} name="Net" connectNulls />
                      <Line
                        type="monotone"
                        dataKey="forecastNet"
                        name="Forecast net"
                        stroke={FORECAST_COLOR}
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={{ fill: FORECAST_COLOR, r: 3 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-[#71717A]">No movement data yet.</p>
                )}
              </div>
            </Card>

            <Card>
              <SectionTitle
                icon={<TrendingUp size={18} />}
                label="Top Movers"
                title="Top 10 Items by OUT Movement"
              />
              <div className="p-5">
                {topMovers.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMovers} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#71717A" }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 11, fill: "#71717A" }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(v) => [Number(v ?? 0), "Units Sold"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E4E4E7", fontSize: 12 }}
                      />
                      <Bar dataKey="total_out" fill="#B08D57" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-8 text-center text-sm text-[#71717A]">No movement data yet.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      <p className="text-xs leading-5 text-[#71717A]">
        * Forecast baselines use a simple linear trend over the displayed history and ignore seasonality,
        promotions, stock limits, holidays, and metal-price changes. Treat them as planning baselines, not guarantees.
      </p>
    </div>
  );
}
