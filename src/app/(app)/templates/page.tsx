"use client";

import { useEffect, useState, useCallback } from "react";

interface Template {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  category: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_BADGE: Record<string, string> = {
  "customer-update": "badge-blue",
  "lead-warming": "badge-amber",
  "cold-outreach": "badge-purple",
  "partner": "badge-teal",
  "general": "badge-slate",
};
const CATEGORY_LABEL: Record<string, string> = {
  "customer-update": "Customer Update",
  "lead-warming": "Lead Warming",
  "cold-outreach": "Cold Outreach",
  "partner": "Partner",
  "general": "General",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filterCat, setFilterCat] = useState("all");

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCat !== "all") params.set("category", filterCat);
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [filterCat]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openEditor = (template?: Template) => {
    setEditingTemplate(template || null);
    setShowEditor(true);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Create reusable email templates with merge fields and AI-assisted content</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openEditor()} className="btn btn-accent">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            New Template
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-1 flex-wrap">
        {["all", "general", "customer-update", "lead-warming", "cold-outreach", "partner"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterCat === cat ? "bg-brand-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat === "all" ? "All" : CATEGORY_LABEL[cat] || cat}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <div className="text-sm font-medium text-slate-600 mb-1">No templates yet</div>
          <div className="text-xs text-slate-400 mb-4">Create your first email template to use in campaigns</div>
          <button onClick={() => openEditor()} className="btn btn-accent">Create Template</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card-hover overflow-hidden cursor-pointer" onClick={() => openEditor(t)}>
              {/* Email preview mock */}
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="text-xs text-slate-500 mt-2">Subject: <span className="text-slate-700 font-medium">{t.subject}</span></div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-800">{t.name}</h3>
                  <span className={`badge ${CATEGORY_BADGE[t.category] || "badge-slate"}`}>
                    {CATEGORY_LABEL[t.category] || t.category}
                  </span>
                </div>
                <div
                  className="text-xs text-slate-500 line-clamp-3 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: t.bodyHtml.replace(/<[^>]*>/g, " ").slice(0, 200) }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    {t.isShared && (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                        Shared
                      </>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{new Date(t.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Editor Modal */}
      {showEditor && (
        <TemplateEditor
          template={editingTemplate}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
          onSave={() => { fetchTemplates(); setShowEditor(false); setEditingTemplate(null); }}
        />
      )}
    </div>
  );
}

// ─── Template Editor ─────────────────────────────────────────

function TemplateEditor({ template, onClose, onSave }: { template: Template | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: template?.name || "",
    subject: template?.subject || "",
    bodyHtml: template?.bodyHtml || "",
    category: template?.category || "general",
    isShared: template?.isShared ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "ai">("edit");

  const mergeFields = ["{{firstName}}", "{{lastName}}", "{{company}}", "{{title}}", "{{email}}"];

  const handleSave = async () => {
    if (!form.name || !form.subject) return;
    setSaving(true);
    try {
      const url = template ? `/api/templates?id=${template.id}` : "/api/templates";
      const method = template ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: form.category }),
      });
      const data = await res.json();
      if (data.subject) setForm(f => ({ ...f, subject: data.subject, bodyHtml: data.bodyHtml || data.body || "" }));
    } finally {
      setGenerating(false);
    }
  };

  const insertMergeField = (field: string) => {
    setForm(f => ({ ...f, bodyHtml: f.bodyHtml + field }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-brand-900">{template ? "Edit Template" : "New Template"}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name || !form.subject} className="btn btn-accent btn-sm">
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="label">Template Name</label>
              <input className="input" placeholder="e.g., Product Launch Announcement" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="general">General</option>
                <option value="customer-update">Customer Update</option>
                <option value="lead-warming">Lead Warming</option>
                <option value="cold-outreach">Cold Outreach</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="mb-4">
            <label className="label">Subject Line</label>
            <input className="input" placeholder="Email subject line with {{merge}} fields" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-slate-200 mb-4">
            {(["edit", "preview", "ai"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab ${activeTab === tab ? "tab-active" : "tab-inactive"}`}
              >
                {tab === "edit" ? "Edit" : tab === "preview" ? "Preview" : "AI Assist"}
              </button>
            ))}
          </div>

          {/* Merge Fields */}
          {activeTab === "edit" && (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Merge fields:</span>
                {mergeFields.map((f) => (
                  <button key={f} onClick={() => insertMergeField(f)} className="px-2 py-0.5 bg-brand-50 text-brand-700 rounded text-xs font-mono hover:bg-brand-100 transition-colors">
                    {f}
                  </button>
                ))}
              </div>
              <textarea
                className="input h-64 font-mono text-xs resize-none"
                placeholder="<p>Hi {{firstName}},</p>&#10;&#10;<p>We're excited to share...</p>"
                value={form.bodyHtml}
                onChange={(e) => setForm({ ...form, bodyHtml: e.target.value })}
              />
            </>
          )}

          {activeTab === "preview" && (
            <div className="card p-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="text-xs text-slate-500 mb-1">Subject:</div>
                <div className="text-sm font-medium text-slate-800">{form.subject || "(no subject)"}</div>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: form.bodyHtml || "<p class='text-slate-400'>No content yet</p>" }}
              />
            </div>
          )}

          {activeTab === "ai" && (
            <div className="space-y-4">
              <div className="card p-4 bg-brand-50 border-brand-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  <span className="text-sm font-semibold text-brand-800">AI Content Assistant</span>
                </div>
                <p className="text-xs text-brand-600">Describe the email you want to create and AI will generate a draft with subject line and body content.</p>
              </div>
              <div>
                <label className="label">Describe your email</label>
                <textarea
                  className="input h-24 resize-none"
                  placeholder="e.g., Write a warm follow-up email to a lead who attended our webinar about cloud migration. Mention our free trial offer."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>
              <button onClick={handleGenerate} disabled={generating || !aiPrompt.trim()} className="btn btn-primary">
                {generating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Generating...
                  </>
                ) : "Generate Content"}
              </button>
            </div>
          )}

          {/* Sharing */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
            <input type="checkbox" id="shared" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} className="rounded border-slate-300" />
            <label htmlFor="shared" className="text-sm text-slate-600">Share with team — allow other users to use this template</label>
          </div>
        </div>
      </div>
    </div>
  );
}
