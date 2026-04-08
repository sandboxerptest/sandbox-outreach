"use client";

import { useEffect, useState, useCallback } from "react";

interface Campaign {
  id: string;
  name: string;
  type: string;
  status: string;
  description: string | null;
  segmentId: string | null;
  templateId: string | null;
  sequenceId: string | null;
  scheduledAt: string | null;
  createdAt: string;
  _count?: { sends: number };
  _sendStats?: { queued: number; sent: number; failed: number; total: number };
  segment?: { name: string } | null;
  template?: { name: string } | null;
  sequence?: { name: string } | null;
}

interface Template { id: string; name: string; subject: string; category: string; }
interface Sequence { id: string; name: string; type: string; steps: { id: string }[]; }
interface Contact { id: string; firstName: string; lastName: string; email: string; type: string; }

const TYPE_CONFIG: Record<string, { label: string; badge: string; description: string }> = {
  "customer-update": { label: "Customer Update", badge: "badge-blue", description: "Product announcements and updates to existing customers" },
  "lead-warming": { label: "Lead Warming", badge: "badge-amber", description: "Nurture interested leads through the long sales cycle" },
  "cold-outreach": { label: "Cold Outreach", badge: "badge-purple", description: "Cadenced outreach over a short window with follow-ups" },
  "partner": { label: "Partner", badge: "badge-teal", description: "Key information and resources for your partner network" },
};
const STATUS_BADGE: Record<string, string> = {
  draft: "badge-slate", scheduled: "badge-blue", active: "badge-green", paused: "badge-amber", completed: "badge-slate",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createType, setCreateType] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [launching, setLaunching] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [autoProcessing, setAutoProcessing] = useState(false);
  const [lastProcessed, setLastProcessed] = useState<string | null>(null);

  const handleProcess = async (silent = false) => {
    if (silent) {
      setAutoProcessing(true);
    } else {
      setProcessing(true);
      setProcessResult(null);
    }
    try {
      const res = await fetch("/api/process", { method: "POST" });
      const data = await res.json();
      if (!silent) {
        setProcessResult(data.message);
        setTimeout(() => setProcessResult(null), 5000);
      }
      const sent = (data.results || []).reduce((s: number, r: { sent: number }) => s + r.sent, 0);
      const steps = (data.results || []).reduce((s: number, r: { sequenceStepsCreated: number }) => s + r.sequenceStepsCreated, 0);
      if (sent > 0 || steps > 0) {
        setLastProcessed(`${sent} sent${steps > 0 ? `, ${steps} sequence steps queued` : ""}`);
        setTimeout(() => setLastProcessed(null), 10000);
      }
      fetchCampaigns();
    } catch {
      if (!silent) setProcessResult("Processing failed");
    } finally {
      setProcessing(false);
      setAutoProcessing(false);
    }
  };

  // ─── Auto-polling: process queue every 60s when active campaigns exist ───
  const hasActive = campaigns.some(c => c.status === "active");
  useEffect(() => {
    if (!hasActive) return;
    const interval = setInterval(() => {
      handleProcess(true); // silent auto-process
    }, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive]);

  const handleLaunch = async (campaignId: string) => {
    setLaunching(campaignId);
    try {
      await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      fetchCampaigns();
    } finally {
      setLaunching(null);
    }
  };

  const handleStatusChange = async (campaignId: string, status: string) => {
    await fetch(`/api/campaigns?id=${campaignId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchCampaigns();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("type");
    if (t && TYPE_CONFIG[t]) setFilterType(t);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/campaigns?${params}`);
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and manage email outreach campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActive && (
            <>
              {/* Auto-processing indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                <div className={`w-1.5 h-1.5 rounded-full ${autoProcessing ? "bg-emerald-400 animate-pulse" : "bg-emerald-500"}`} />
                {autoProcessing ? "Processing..." : "Auto-processing"}
              </div>
              <button onClick={() => handleProcess(false)} disabled={processing || autoProcessing} className="btn btn-primary">
                {processing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Process Now
                  </>
                )}
              </button>
            </>
          )}
          <button onClick={() => { setCreateType(null); setShowCreate(true); }} className="btn btn-accent">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Campaign
          </button>
        </div>
      </div>

      {/* Process Result Banner */}
      {(processResult || lastProcessed) && (
        <div className="card p-3 bg-brand-50 border-brand-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-sm text-brand-800">{processResult || lastProcessed}</span>
        </div>
      )}

      {/* Type Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const count = campaigns.filter(c => c.type === type).length;
          const active = campaigns.filter(c => c.type === type && c.status === "active").length;
          return (
            <button key={type} onClick={() => setFilterType(filterType === type ? "all" : type)}
              className={`card-hover p-4 text-left transition-all ${filterType === type ? "ring-2 ring-accent-500 border-accent-300" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${config.badge}`}>{config.label}</span>
                {active > 0 && <span className="badge badge-green">{active} active</span>}
              </div>
              <div className="text-2xl font-bold text-brand-900">{count}</div>
              <div className="text-xs text-slate-500 mt-1">{config.description}</div>
            </button>
          );
        })}
      </div>

      {/* Status Filters */}
      <div className="flex gap-1 flex-wrap">
        {["all", "draft", "scheduled", "active", "paused", "completed"].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? "bg-brand-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-3">
        {loading ? (
          <div className="card p-12 text-center text-slate-400 text-sm">Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <div className="text-sm font-medium text-slate-600 mb-1">No campaigns yet</div>
            <div className="text-xs text-slate-400 mb-4">Choose a campaign type to get started</div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                <button key={type} onClick={() => { setCreateType(type); setShowCreate(true); }} className="btn btn-sm btn-outline">{config.label}</button>
              ))}
            </div>
          </div>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="card-hover p-5 cursor-pointer" onClick={() => setEditingCampaign(c)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-800">{c.name}</h3>
                    <span className={`badge ${TYPE_CONFIG[c.type]?.badge || "badge-slate"}`}>{TYPE_CONFIG[c.type]?.label || c.type}</span>
                    <span className={`badge ${STATUS_BADGE[c.status] || "badge-slate"}`}>{c.status}</span>
                  </div>
                  {c.description && <p className="text-xs text-slate-500 mt-1">{c.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    {c.template ? <span>Template: {c.template.name}</span> : <span className="text-amber-500">No template</span>}
                    {c.sequence ? <span>Sequence: {c.sequence.name}</span> : <span className="text-slate-300">No sequence</span>}
                    {c.scheduledAt && <span>Scheduled: {new Date(c.scheduledAt).toLocaleDateString()}</span>}
                    {(c._count?.sends ?? 0) > 0 && <span>{c._count?.sends} emails</span>}
                  </div>
                  {/* Send progress bar */}
                  {c.status !== "draft" && (c._count?.sends ?? 0) > 0 && c._sendStats && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${c._sendStats.total > 0 ? (c._sendStats.sent / c._sendStats.total) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
                        {c._sendStats.sent}/{c._sendStats.total} sent
                        {c._sendStats.failed > 0 && <span className="text-red-500 ml-1">{c._sendStats.failed} failed</span>}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {c.status === "draft" && (
                    <button onClick={() => handleLaunch(c.id)} disabled={launching === c.id} className="btn btn-sm btn-accent">
                      {launching === c.id ? "Launching..." : "Launch"}
                    </button>
                  )}
                  {c.status === "active" && (
                    <button onClick={() => handleStatusChange(c.id, "paused")} className="btn btn-sm btn-outline">Pause</button>
                  )}
                  {c.status === "paused" && (
                    <button onClick={() => handleStatusChange(c.id, "active")} className="btn btn-sm btn-accent">Resume</button>
                  )}
                  <button onClick={() => setEditingCampaign(c)} className="btn btn-sm btn-ghost">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateCampaignModal
          type={createType}
          onClose={() => setShowCreate(false)}
          onSave={() => { fetchCampaigns(); setShowCreate(false); }}
        />
      )}

      {editingCampaign && (
        <EditCampaignModal
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSave={() => { fetchCampaigns(); setEditingCampaign(null); }}
          onDelete={() => { fetchCampaigns(); setEditingCampaign(null); }}
        />
      )}
    </div>
  );
}

// ─── Create Campaign Modal ────────────────────────────────────

function CreateCampaignModal({ type, onClose, onSave }: { type: string | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", type: type || "customer-update", description: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave();
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-brand-900">New Campaign</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Campaign Name *</label>
            <input className="input" placeholder="e.g., Q2 Product Update" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Campaign Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (<option key={val} value={val}>{cfg.label}</option>))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{TYPE_CONFIG[form.type]?.description}</p>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name} className="btn btn-accent">{saving ? "Creating..." : "Create Campaign"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Campaign Modal ──────────────────────────────────────

function EditCampaignModal({ campaign, onClose, onSave, onDelete }: {
  campaign: Campaign;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({
    name: campaign.name,
    type: campaign.type,
    description: campaign.description || "",
    status: campaign.status,
    templateId: campaign.templateId || "",
    sequenceId: campaign.sequenceId || "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load available templates, sequences, and contacts
  const [templates, setTemplates] = useState<Template[]>([]);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    fetch("/api/templates").then(r => r.json()).then(d => setTemplates(d.templates || []));
    fetch("/api/sequences").then(r => r.json()).then(d => setSequences(d.sequences || []));
    fetch("/api/contacts").then(r => r.json()).then(d => setContacts(d.contacts || []));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/campaigns?id=${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          templateId: form.templateId || null,
          sequenceId: form.sequenceId || null,
        }),
      });
      onSave();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await fetch(`/api/campaigns?id=${campaign.id}`, { method: "DELETE" });
    onDelete();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-bold text-brand-900">Edit Campaign</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${TYPE_CONFIG[campaign.type]?.badge || "badge-slate"}`}>{TYPE_CONFIG[campaign.type]?.label}</span>
              <span className={`badge ${STATUS_BADGE[campaign.status] || "badge-slate"}`}>{campaign.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Campaign Details</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Name</label>
                  <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (<option key={val} value={val}>{cfg.label}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input h-16 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Template */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Email Template</h4>
            {templates.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 text-center">
                <div className="text-sm text-slate-500">No templates yet</div>
                <a href="/templates" className="text-xs text-accent-600 hover:underline">Create a template first</a>
              </div>
            ) : (
              <div className="space-y-2">
                <select className="input" value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })}>
                  <option value="">— No template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
                {form.templateId && (() => {
                  const t = templates.find(t => t.id === form.templateId);
                  return t ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-500">Subject: <span className="text-slate-700 font-medium">{t.subject}</span></div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* Sequence */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Automation Sequence</h4>
            {sequences.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 text-center">
                <div className="text-sm text-slate-500">No sequences yet</div>
                <a href="/sequences" className="text-xs text-accent-600 hover:underline">Build a sequence first</a>
              </div>
            ) : (
              <div className="space-y-2">
                <select className="input" value={form.sequenceId} onChange={(e) => setForm({ ...form, sequenceId: e.target.value })}>
                  <option value="">— No sequence (single send) —</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.steps.length} steps)</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Target Contacts</h4>
            {contacts.length === 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 text-center">
                <div className="text-sm text-slate-500">No contacts yet</div>
                <a href="/contacts" className="text-xs text-accent-600 hover:underline">Import contacts first</a>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">All active contacts</span>
                  <span className="badge badge-blue">{contacts.filter(c => c.type === campaign.type.replace("customer-update", "customer").replace("lead-warming", "lead").replace("cold-outreach", "prospect")).length || contacts.length} contacts</span>
                </div>
                <div className="text-xs text-slate-500">
                  Contacts are targeted based on campaign type. Use the Contacts page to manage your contact list and filter by type.
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {["customer", "lead", "partner", "prospect"].map((type) => {
                    const count = contacts.filter(c => c.type === type).length;
                    return count > 0 ? (
                      <span key={type} className="badge badge-slate">{count} {type}s</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Status</h4>
            <select className="input w-48" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button onClick={() => setConfirmDelete(true)} className="btn btn-sm text-red-600 hover:bg-red-50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-accent">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-2xl">
            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm mx-4">
              <div className="text-sm font-medium text-slate-800 mb-2">Delete this campaign?</div>
              <div className="text-xs text-slate-500 mb-4">This will permanently remove &quot;{campaign.name}&quot; and all associated send data.</div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className="btn btn-sm btn-ghost">Cancel</button>
                <button onClick={handleDelete} className="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
