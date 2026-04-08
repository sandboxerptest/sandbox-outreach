"use client";

import { useState, useEffect, useCallback } from "react";

interface Settings {
  emailProvider?: string;
  // Gmail
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRefreshToken?: string;
  gmailSenderEmail?: string;
  // O365
  o365ClientId?: string;
  o365ClientSecret?: string;
  o365TenantId?: string;
  o365SenderEmail?: string;
  // Team
  shareTemplates?: boolean;
  campaignApproval?: boolean;
  activityNotifications?: boolean;
  // Sending
  dailySendLimit?: number;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  timezone?: string;
  sendDelay?: number;
  includeUnsubscribe?: boolean;
  unsubscribeText?: string;
  // General
  companyName?: string;
  defaultFromName?: string;
  replyToAddress?: string;
}

const DEFAULTS: Settings = {
  emailProvider: "gmail",
  shareTemplates: true,
  campaignApproval: true,
  activityNotifications: false,
  dailySendLimit: 500,
  sendWindowStart: "08:00",
  sendWindowEnd: "17:00",
  timezone: "America/New_York (ET)",
  sendDelay: 30,
  includeUnsubscribe: true,
  unsubscribeText: "If you no longer wish to receive these emails, click here to unsubscribe.",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("email");
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) setSettings({ ...DEFAULTS, ...data.settings });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = useCallback(async (updates?: Partial<Settings>) => {
    const toSave = updates ? { ...settings, ...updates } : settings;
    if (updates) setSettings(toSave);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSave),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const update = (key: keyof Settings, value: string | number | boolean) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Loading settings...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure integrations, team access, and system preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Saved
            </span>
          )}
          <button onClick={() => saveSettings()} disabled={saving} className="btn btn-accent">
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {[
          { id: "email", label: "Email Provider" },
          { id: "team", label: "Team" },
          { id: "api", label: "API & Imports" },
          { id: "sending", label: "Sending" },
          { id: "general", label: "General" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? "tab-active" : "tab-inactive"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Email Provider ──────────────────────────── */}
      {activeTab === "email" && (
        <div className="space-y-6">
          <div className="card p-4">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-sm font-semibold text-brand-900">Email Provider</h3>
              <span className="badge badge-slate">Choose one</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => update("emailProvider", "gmail")}
                className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                  settings.emailProvider === "gmail"
                    ? "border-accent-500 bg-accent-50/30 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115Z"/>
                    <path fill="#34A853" d="M16.04 18.013C14.95 18.717 13.563 19.091 12 19.091c-2.7 0-4.986-1.55-6.129-3.83L1.84 18.38C3.79 22.27 7.84 24 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987Z"/>
                    <path fill="#4A90D9" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.558L19.834 21Z"/>
                    <path fill="#FBBC05" d="M5.871 14.261A7.12 7.12 0 0 1 5.455 12c0-.782.136-1.54.371-2.261L1.8 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.24 5.35l4.631-3.089Z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Gmail / Google Workspace</div>
                  <div className="text-xs text-slate-500 mt-0.5">Send via Gmail API with OAuth2</div>
                </div>
              </button>
              <button
                onClick={() => update("emailProvider", "office365")}
                className={`p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                  settings.emailProvider === "office365"
                    ? "border-accent-500 bg-accent-50/30 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="#0078D4">
                    <path d="M21.17 2.06A2.13 2.13 0 0019.04.01L8.5 2.93a2.13 2.13 0 00-1.63 2.07v2.08L2.44 8.66A2.13 2.13 0 00.87 10.7v5.49a2.13 2.13 0 001.57 2.05l4.43 1.58v1.25a2.13 2.13 0 001.63 2.07l10.54 2.92a2.13 2.13 0 002.13-.28 2.13 2.13 0 00.83-1.7V3.93a2.13 2.13 0 00-.83-1.87zM6.87 16.2L2.87 14.8V10.2l4 1.39v4.6zm12.26 4.87L9.04 18.5V5.5l10.09-2.57v18.14z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">Microsoft Office 365</div>
                  <div className="text-xs text-slate-500 mt-0.5">Send via Microsoft Graph API</div>
                </div>
              </button>
            </div>
          </div>

          {/* Gmail Config */}
          {settings.emailProvider === "gmail" && (
            <>
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-brand-900">Gmail / Google Workspace</h3>
                    <p className="text-sm text-slate-500 mt-1">Connect your Google account to send emails.</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="label">Client ID</label>
                        <input className="input font-mono text-xs" placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com" value={settings.gmailClientId || ""} onChange={(e) => update("gmailClientId", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Client Secret</label>
                        <input type="password" className="input font-mono text-xs" placeholder="Enter client secret" value={settings.gmailClientSecret || ""} onChange={(e) => update("gmailClientSecret", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Refresh Token</label>
                        <input type="password" className="input font-mono text-xs" placeholder="Enter refresh token" value={settings.gmailRefreshToken || ""} onChange={(e) => update("gmailRefreshToken", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Sender Email</label>
                        <input type="email" className="input" placeholder="outreach@yourcompany.com" value={settings.gmailSenderEmail || ""} onChange={(e) => update("gmailSenderEmail", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-base font-semibold text-brand-900 mb-3">Gmail OAuth Setup Guide</h3>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Go to <span className="font-mono text-xs bg-slate-100 px-1 rounded">Google Cloud Console → APIs & Services → Credentials</span></li>
                  <li>Create an OAuth 2.0 Client ID (Web application type)</li>
                  <li>Enable the <span className="font-mono text-xs bg-slate-100 px-1 rounded">Gmail API</span> under Library</li>
                  <li>Set authorized redirect URI to your deployment URL</li>
                  <li>Copy Client ID and Client Secret above</li>
                  <li>Complete the OAuth consent screen and generate a refresh token</li>
                </ol>
              </div>
            </>
          )}

          {/* O365 Config */}
          {settings.emailProvider === "office365" && (
            <>
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M21.17 2.06A2.13 2.13 0 0019.04.01L8.5 2.93a2.13 2.13 0 00-1.63 2.07v2.08L2.44 8.66A2.13 2.13 0 00.87 10.7v5.49a2.13 2.13 0 001.57 2.05l4.43 1.58v1.25a2.13 2.13 0 001.63 2.07l10.54 2.92a2.13 2.13 0 002.13-.28 2.13 2.13 0 00.83-1.7V3.93a2.13 2.13 0 00-.83-1.87zM6.87 16.2L2.87 14.8V10.2l4 1.39v4.6zm12.26 4.87L9.04 18.5V5.5l10.09-2.57v18.14z"/></svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-brand-900">Microsoft Office 365</h3>
                    <p className="text-sm text-slate-500 mt-1">Connect your Office 365 account to send emails.</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="label">Client ID</label>
                        <input className="input font-mono text-xs" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={settings.o365ClientId || ""} onChange={(e) => update("o365ClientId", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Client Secret</label>
                        <input type="password" className="input font-mono text-xs" placeholder="Enter client secret" value={settings.o365ClientSecret || ""} onChange={(e) => update("o365ClientSecret", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Tenant ID</label>
                        <input className="input font-mono text-xs" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={settings.o365TenantId || ""} onChange={(e) => update("o365TenantId", e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Sender Email</label>
                        <input type="email" className="input" placeholder="outreach@yourcompany.com" value={settings.o365SenderEmail || ""} onChange={(e) => update("o365SenderEmail", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <h3 className="text-base font-semibold text-brand-900 mb-3">OAuth Setup Guide</h3>
                <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
                  <li>Go to <span className="font-mono text-xs bg-slate-100 px-1 rounded">Azure Portal → App Registrations</span></li>
                  <li>Create a new registration with Mail.Send and Mail.ReadWrite permissions</li>
                  <li>Set redirect URI to your deployment URL</li>
                  <li>Copy Client ID, Client Secret, and Tenant ID above</li>
                  <li>Grant admin consent for the application permissions</li>
                </ol>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Team ────────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-brand-900">Team Members</h3>
              <button className="btn btn-accent btn-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                Invite Member
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-accent-600 flex items-center justify-center text-white text-sm font-bold">You</div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">Current User</div>
                    <div className="text-xs text-slate-500">Logged in</div>
                  </div>
                </div>
                <span className="badge badge-blue">Admin</span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Collaboration Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input type="checkbox" checked={settings.shareTemplates ?? true} onChange={(e) => update("shareTemplates", e.target.checked)} className="rounded border-slate-300" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Share templates by default</div>
                  <div className="text-xs text-slate-500">New templates are visible to all team members</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input type="checkbox" checked={settings.campaignApproval ?? true} onChange={(e) => update("campaignApproval", e.target.checked)} className="rounded border-slate-300" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Campaign approval required</div>
                  <div className="text-xs text-slate-500">Campaigns must be approved by a manager before launching</div>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                <input type="checkbox" checked={settings.activityNotifications ?? false} onChange={(e) => update("activityNotifications", e.target.checked)} className="rounded border-slate-300" />
                <div>
                  <div className="text-sm font-medium text-slate-700">Activity notifications</div>
                  <div className="text-xs text-slate-500">Email team members when campaigns are launched or completed</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ─── API & Imports ────────────────────────────── */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">API Access</h3>
            <p className="text-sm text-slate-500 mb-4">Use the API to import contacts, trigger campaigns, and push content from external systems.</p>
            <div>
              <label className="label">API Key</label>
              <div className="flex gap-2">
                <input className="input font-mono text-xs" value="sk-sandbox-••••••••••••••••" readOnly />
                <button className="btn btn-outline btn-sm whitespace-nowrap">Regenerate</button>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-slate-50">
              <div className="text-xs font-semibold text-slate-600 mb-2">Endpoints</div>
              <div className="space-y-1 font-mono text-xs text-slate-500">
                <div><span className="text-emerald-600 font-bold">POST</span> /api/contacts — Create/import contacts</div>
                <div><span className="text-emerald-600 font-bold">POST</span> /api/import — Bulk CSV import</div>
                <div><span className="text-blue-600 font-bold">GET</span> /api/contacts — List/search contacts</div>
                <div><span className="text-emerald-600 font-bold">POST</span> /api/campaigns — Create campaigns</div>
                <div><span className="text-emerald-600 font-bold">POST</span> /api/templates — Create templates</div>
                <div><span className="text-emerald-600 font-bold">POST</span> /api/ai-generate — Generate content via AI</div>
                <div><span className="text-emerald-600 font-bold">POST</span> /api/send — Trigger email sends</div>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Data Import Sources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "CSV Upload", desc: "Import contacts from a CSV file", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", enabled: true },
                { name: "REST API", desc: "Push contacts via API endpoint", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4", enabled: true },
                { name: "Webhook", desc: "Receive contacts from external triggers", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", enabled: false },
              ].map((source) => (
                <div key={source.name} className={`card p-4 ${source.enabled ? "" : "opacity-50"}`}>
                  <svg className="w-6 h-6 text-brand-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={source.icon} /></svg>
                  <div className="text-sm font-medium text-slate-700">{source.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{source.desc}</div>
                  {!source.enabled && <span className="badge badge-slate mt-2">Coming Soon</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Sending ─────────────────────────────────── */}
      {activeTab === "sending" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Send Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Daily Send Limit</label>
                <input type="number" className="input w-48" value={settings.dailySendLimit ?? 500} onChange={(e) => update("dailySendLimit", parseInt(e.target.value) || 0)} />
                <p className="text-xs text-slate-400 mt-1">Maximum emails per day to protect deliverability</p>
              </div>
              <div>
                <label className="label">Send Window</label>
                <div className="flex items-center gap-2">
                  <input type="time" className="input w-36" value={settings.sendWindowStart || "08:00"} onChange={(e) => update("sendWindowStart", e.target.value)} />
                  <span className="text-sm text-slate-500">to</span>
                  <input type="time" className="input w-36" value={settings.sendWindowEnd || "17:00"} onChange={(e) => update("sendWindowEnd", e.target.value)} />
                </div>
                <p className="text-xs text-slate-400 mt-1">Only send during business hours</p>
              </div>
              <div>
                <label className="label">Timezone</label>
                <select className="input w-64" value={settings.timezone || "America/New_York (ET)"} onChange={(e) => update("timezone", e.target.value)}>
                  <option>America/New_York (ET)</option>
                  <option>America/Chicago (CT)</option>
                  <option>America/Denver (MT)</option>
                  <option>America/Los_Angeles (PT)</option>
                  <option>UTC</option>
                </select>
              </div>
              <div>
                <label className="label">Delay Between Sends</label>
                <div className="flex items-center gap-2">
                  <input type="number" className="input w-24" value={settings.sendDelay ?? 30} onChange={(e) => update("sendDelay", parseInt(e.target.value) || 0)} />
                  <span className="text-sm text-slate-500">seconds</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Spacing between individual emails to avoid rate limits</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Unsubscribe Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={settings.includeUnsubscribe ?? true} onChange={(e) => update("includeUnsubscribe", e.target.checked)} className="rounded border-slate-300" />
                <div className="text-sm text-slate-700">Include unsubscribe link in all emails</div>
              </label>
              <div>
                <label className="label">Unsubscribe Footer Text</label>
                <textarea className="input h-16 text-xs resize-none" value={settings.unsubscribeText || ""} onChange={(e) => update("unsubscribeText", e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── General ─────────────────────────────────── */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Organization</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Company Name</label>
                <input className="input" placeholder="Your Company" value={settings.companyName || ""} onChange={(e) => update("companyName", e.target.value)} />
              </div>
              <div>
                <label className="label">Default From Name</label>
                <input className="input" placeholder="e.g., Sales Team at Sandbox" value={settings.defaultFromName || ""} onChange={(e) => update("defaultFromName", e.target.value)} />
              </div>
              <div>
                <label className="label">Reply-To Address</label>
                <input type="email" className="input" placeholder="reply@yourcompany.com" value={settings.replyToAddress || ""} onChange={(e) => update("replyToAddress", e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-base font-semibold text-brand-900 mb-3">Data Management</h3>
            <div className="flex gap-2">
              <button className="btn btn-outline">Export All Contacts</button>
              <button className="btn btn-outline">Export Campaign Data</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
