"use client";

import { useEffect, useState } from "react";

interface Stats {
  kpis: {
    totalContacts: number;
    activeCampaigns: number;
    totalCampaigns: number;
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
  byType: { type: string; sent: number; opened: number; clicked: number; openRate: number; clickRate: number }[];
  recentActivity: { id: string; type: string; description: string; createdAt: string }[];
}

const TYPE_LABEL: Record<string, string> = {
  "customer-update": "Customer Update",
  "lead-warming": "Lead Warming",
  "cold-outreach": "Cold Outreach",
  "partner": "Partner",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats?range=30d")
      .then(r => r.json())
      .then(data => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>;
  }

  const k = stats?.kpis;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your outreach activity and performance</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kpi-card">
          <div className="kpi-label">Total Contacts</div>
          <div className="kpi-value">{k?.totalContacts ?? 0}</div>
          <div className="kpi-change-up">{k?.totalContacts === 0 ? "Import to get started" : `${k?.totalContacts} in database`}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Active Campaigns</div>
          <div className="kpi-value">{k?.activeCampaigns ?? 0}</div>
          <div className="kpi-change-up">{k?.totalCampaigns ?? 0} total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Emails Sent (30d)</div>
          <div className="kpi-value">{k?.emailsSent ?? 0}</div>
          <div className={k?.failed ? "kpi-change-down" : "kpi-change-up"}>
            {k?.emailsSent === 0 ? "Connect email provider" : `${k?.delivered ?? 0} delivered`}
            {(k?.failed ?? 0) > 0 && `, ${k?.failed} failed`}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Open Rate</div>
          <div className="kpi-value">{k?.openRate ?? 0}%</div>
          <div className="kpi-change-up">
            {k?.emailsSent === 0 ? "No data yet" : `${k?.opened ?? 0} opened, ${k?.clicked ?? 0} clicked`}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-brand-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/contacts" className="card-hover p-4 text-center group">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            </div>
            <div className="text-sm font-medium text-slate-700">Import Contacts</div>
          </a>
          <a href="/campaigns" className="card-hover p-4 text-center group">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center group-hover:bg-accent-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </div>
            <div className="text-sm font-medium text-slate-700">New Campaign</div>
          </a>
          <a href="/templates" className="card-hover p-4 text-center group">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" /></svg>
            </div>
            <div className="text-sm font-medium text-slate-700">Create Template</div>
          </a>
          <a href="/sequences" className="card-hover p-4 text-center group">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div className="text-sm font-medium text-slate-700">Build Sequence</div>
          </a>
        </div>
      </div>

      {/* Engagement Stats + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance by Type */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-brand-900">Performance by Channel</h2>
          </div>
          <div className="p-5">
            {!stats?.byType?.some(t => t.sent > 0) ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                No send data yet. Launch a campaign to see performance.
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.byType?.filter(t => t.sent > 0).map(t => (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{TYPE_LABEL[t.type] || t.type}</span>
                      <span className="text-xs text-slate-500">{t.sent} sent</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Open rate</span><span>{t.openRate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${t.openRate}%` }} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>Click rate</span><span>{t.clickRate}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500" style={{ width: `${t.clickRate}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-brand-900">Recent Activity</h2>
          </div>
          <div className="p-5">
            {!stats?.recentActivity?.length ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                No activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      a.type.includes("fail") ? "bg-red-400" : a.type.includes("sent") ? "bg-emerald-400" : a.type.includes("launch") ? "bg-accent-400" : "bg-blue-400"
                    }`} />
                    <div>
                      <div className="text-sm text-slate-700">{a.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outreach Channels */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-brand-900 mb-4">Outreach Channels</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { type: "customer-update", title: "Customer Updates", desc: "Product announcements and updates to your existing customer base", color: "blue", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { type: "lead-warming", title: "Lead Warming", desc: "Nurture interested leads through the long sales cycle", color: "amber", icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" },
            { type: "cold-outreach", title: "Cold Outreach", desc: "Short-window cadenced outreach with follow-ups", color: "purple", icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
            { type: "partner", title: "Partner Emails", desc: "Send relevant info and resources to your partner network", color: "teal", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
          ].map((ch) => (
            <a key={ch.type} href={`/campaigns?type=${ch.type}`} className="card-hover p-4 group">
              <div className={`w-9 h-9 rounded-lg bg-${ch.color}-50 text-${ch.color}-600 flex items-center justify-center mb-3 group-hover:bg-${ch.color}-100 transition-colors`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={ch.icon} /></svg>
              </div>
              <div className="text-sm font-semibold text-slate-800 mb-1">{ch.title}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{ch.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
