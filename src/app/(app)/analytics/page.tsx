"use client";

import { useState, useEffect, useCallback } from "react";

interface Stats {
  kpis: {
    emailsSent: number;
    delivered: number;
    deliveredRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    opened: number;
    clicked: number;
    failed: number;
    bounced: number;
  };
  byType: {
    type: string;
    total: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    openRate: number;
    clickRate: number;
  }[];
  dailySends: Record<string, { sent: number; opened: number; clicked: number }>;
}

const TYPE_LABEL: Record<string, string> = {
  "customer-update": "Customer Updates",
  "lead-warming": "Lead Warming",
  "cold-outreach": "Cold Outreach",
  "partner": "Partner",
};
const TYPE_BADGE: Record<string, string> = {
  "customer-update": "badge-blue",
  "lead-warming": "badge-amber",
  "cold-outreach": "badge-purple",
  "partner": "badge-teal",
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?range=${dateRange}`);
      const data = await res.json();
      setStats(data);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const k = stats?.kpis;
  const replyRate = 0; // Reply tracking not yet implemented

  const kpis = [
    { label: "Emails Sent", value: String(k?.emailsSent ?? 0) },
    { label: "Delivered", value: `${k?.deliveredRate ?? 0}%` },
    { label: "Open Rate", value: `${k?.openRate ?? 0}%` },
    { label: "Click Rate", value: `${k?.clickRate ?? 0}%` },
    { label: "Reply Rate", value: `${replyRate}%` },
    { label: "Bounce Rate", value: `${k?.bounceRate ?? 0}%` },
  ];

  // Chart data: last N days
  const chartDays = Object.entries(stats?.dailySends || {}).sort(([a], [b]) => a.localeCompare(b));
  const maxSent = Math.max(1, ...chartDays.map(([, d]) => d.sent));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Track email performance and engagement metrics</p>
        </div>
        <div className="flex gap-1">
          {["7d", "30d", "90d", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                dateRange === range ? "bg-brand-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {range === "all" ? "All Time" : `Last ${range}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Loading analytics...</div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="kpi-card">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value text-xl">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sends Over Time - Bar Chart */}
            <div className="card p-5">
              <h3 className="text-base font-semibold text-brand-900 mb-4">Sends Over Time</h3>
              {chartDays.length === 0 ? (
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                  <div className="text-center text-slate-400 text-sm">No send data for this period</div>
                </div>
              ) : (
                <div className="h-48 flex items-end gap-1 px-2">
                  {chartDays.map(([day, data]) => (
                    <div key={day} className="flex-1 flex flex-col items-center gap-1" title={`${day}: ${data.sent} sent, ${data.opened} opened`}>
                      <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: "160px" }}>
                        <div
                          className="w-full bg-brand-500 rounded-t-sm min-h-[2px]"
                          style={{ height: `${(data.sent / maxSent) * 100}%` }}
                        />
                        {data.opened > 0 && (
                          <div
                            className="w-full bg-emerald-400 rounded-t-sm"
                            style={{ height: `${(data.opened / maxSent) * 100}%`, marginTop: "-" + ((data.opened / maxSent) * 100) + "%" }}
                          />
                        )}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate w-full text-center">{day.slice(5)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-brand-500" /> Sent
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> Opened
                </div>
              </div>
            </div>

            {/* Engagement Funnel */}
            <div className="card p-5">
              <h3 className="text-base font-semibold text-brand-900 mb-4">Engagement Funnel</h3>
              {(k?.emailsSent ?? 0) === 0 ? (
                <div className="h-48 flex items-center justify-center bg-slate-50 rounded-lg">
                  <div className="text-center text-slate-400 text-sm">No send data for this period</div>
                </div>
              ) : (
                <div className="space-y-3 py-2">
                  {[
                    { label: "Sent", value: k?.emailsSent ?? 0, pct: 100, color: "bg-brand-500" },
                    { label: "Delivered", value: k?.delivered ?? 0, pct: k?.deliveredRate ?? 0, color: "bg-blue-500" },
                    { label: "Opened", value: k?.opened ?? 0, pct: k?.openRate ?? 0, color: "bg-emerald-500" },
                    { label: "Clicked", value: k?.clicked ?? 0, pct: k?.clickRate ?? 0, color: "bg-accent-500" },
                  ].map((step) => (
                    <div key={step.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{step.label}</span>
                        <span className="text-xs text-slate-500 font-mono">{step.value} ({step.pct}%)</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${step.color} transition-all`} style={{ width: `${step.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Campaign Breakdown */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-brand-900 mb-4">Performance by Campaign Type</h3>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Sent</th>
                    <th>Delivered</th>
                    <th>Opens</th>
                    <th>Open Rate</th>
                    <th>Clicks</th>
                    <th>Click Rate</th>
                    <th>Bounces</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.byType?.map((row) => (
                    <tr key={row.type}>
                      <td><span className={`badge ${TYPE_BADGE[row.type] || "badge-slate"}`}>{TYPE_LABEL[row.type] || row.type}</span></td>
                      <td className="font-mono text-xs">{row.sent}</td>
                      <td className="font-mono text-xs">{row.delivered}</td>
                      <td className="font-mono text-xs">{row.opened}</td>
                      <td className="font-mono text-xs">{row.openRate}%</td>
                      <td className="font-mono text-xs">{row.clicked}</td>
                      <td className="font-mono text-xs">{row.clickRate}%</td>
                      <td className="font-mono text-xs">{row.bounced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
