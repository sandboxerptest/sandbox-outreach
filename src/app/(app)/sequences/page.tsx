"use client";

import { useEffect, useState, useCallback } from "react";

interface Sequence {
  id: string;
  name: string;
  type: string;
  description: string | null;
  status: string;
  createdAt: string;
  steps: SequenceStep[];
}

interface SequenceStep {
  id: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  action: string;
  subject: string | null;
  bodyHtml: string | null;
  isForward: boolean;
  template?: { name: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; badge: string; defaultSteps: { action: string; delayDays: number; subject: string; isForward: boolean; hint: string }[] }> = {
  "customer-update": {
    label: "Customer Update",
    badge: "badge-blue",
    defaultSteps: [
      { action: "send-email", delayDays: 0, subject: "Exciting Updates from {{company}}", isForward: false, hint: "Main announcement email" },
      { action: "send-email", delayDays: 3, subject: "Did you see our latest update?", isForward: false, hint: "Reminder with additional details" },
    ],
  },
  "lead-warming": {
    label: "Lead Warming",
    badge: "badge-amber",
    defaultSteps: [
      { action: "send-email", delayDays: 0, subject: "Thanks for your interest, {{firstName}}", isForward: false, hint: "Initial value-add email" },
      { action: "send-email", delayDays: 4, subject: "Quick question about your needs", isForward: false, hint: "Engagement / qualification" },
      { action: "send-email", delayDays: 7, subject: "Resource you might find helpful", isForward: false, hint: "Educational content" },
      { action: "send-email", delayDays: 14, subject: "Checking in", isForward: false, hint: "Soft follow-up" },
      { action: "send-email", delayDays: 21, subject: "When the time is right", isForward: false, hint: "Long-term nurture close" },
    ],
  },
  "cold-outreach": {
    label: "Cold Outreach",
    badge: "badge-purple",
    defaultSteps: [
      { action: "send-email", delayDays: 0, subject: "Quick intro — {{firstName}}", isForward: false, hint: "Initial cold email" },
      { action: "send-forward", delayDays: 2, subject: "Re: Quick intro", isForward: true, hint: "Bumping to top of inbox" },
      { action: "send-email", delayDays: 4, subject: "Thought this might help", isForward: false, hint: "Value-add with case study or resource" },
      { action: "send-forward", delayDays: 7, subject: "Re: Quick intro", isForward: true, hint: "Final forward — soft close" },
      { action: "send-email", delayDays: 10, subject: "Closing the loop", isForward: false, hint: "Break-up / not the best time" },
    ],
  },
  "partner": {
    label: "Partner",
    badge: "badge-teal",
    defaultSteps: [
      { action: "send-email", delayDays: 0, subject: "Partner Update: {{subject}}", isForward: false, hint: "Main partner communication" },
      { action: "send-email", delayDays: 5, subject: "Resources for our partners", isForward: false, hint: "Supporting materials" },
    ],
  },
};
const STATUS_BADGE: Record<string, string> = {
  draft: "badge-slate",
  active: "badge-green",
  paused: "badge-amber",
  archived: "badge-slate",
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch("/api/sequences");
      const data = await res.json();
      setSequences(data.sequences || []);
    } catch {
      setSequences([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Sequences</h1>
          <p className="page-subtitle">Build automated email cadences with timed follow-ups</p>
        </div>
        <button onClick={() => { setEditingSequence(null); setShowBuilder(true); }} className="btn btn-accent">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Sequence
        </button>
      </div>

      {/* Sequence Type Quick-Start */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            onClick={() => { setEditingSequence(null); setShowBuilder(true); }}
            className="card-hover p-4 text-left"
          >
            <span className={`badge ${config.badge} mb-2`}>{config.label}</span>
            <div className="text-xs text-slate-500">{config.defaultSteps.length} steps</div>
            <div className="flex items-center gap-1 mt-2">
              {config.defaultSteps.map((_, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-accent-500" : "bg-slate-300"}`} />
                  {i < config.defaultSteps.length - 1 && <div className="w-3 h-px bg-slate-200" />}
                </div>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Sequence List */}
      {loading ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="text-sm font-medium text-slate-600 mb-1">No sequences yet</div>
          <div className="text-xs text-slate-400 mb-4">Build your first automated email cadence</div>
          <button onClick={() => setShowBuilder(true)} className="btn btn-accent">Build Sequence</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div key={seq.id} className="card overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === seq.id ? null : seq.id)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-800">{seq.name}</h3>
                    <span className={`badge ${TYPE_CONFIG[seq.type]?.badge || "badge-slate"}`}>{TYPE_CONFIG[seq.type]?.label || seq.type}</span>
                    <span className={`badge ${STATUS_BADGE[seq.status] || "badge-slate"}`}>{seq.status}</span>
                  </div>
                  {seq.description && <p className="text-xs text-slate-500">{seq.description}</p>}
                  <div className="text-xs text-slate-400 mt-1">{seq.steps.length} steps</div>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandedId === seq.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {expandedId === seq.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <div className="space-y-0">
                    {seq.steps.sort((a, b) => a.stepOrder - b.stepOrder).map((step, i) => (
                      <div key={step.id}>
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              step.isForward ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"
                            }`}>
                              {i + 1}
                            </div>
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">
                                {step.isForward ? "Forward" : "Send Email"}
                              </span>
                              {step.delayDays > 0 && (
                                <span className="text-xs text-slate-400">
                                  +{step.delayDays}d {step.delayHours > 0 ? `${step.delayHours}h` : ""} delay
                                </span>
                              )}
                              {i === 0 && <span className="text-xs text-slate-400">Immediately</span>}
                            </div>
                            {step.subject && <div className="text-xs text-slate-500 mt-0.5">Subject: {step.subject}</div>}
                            {step.template && <div className="text-xs text-slate-400">Template: {step.template.name}</div>}
                          </div>
                        </div>
                        {i < seq.steps.length - 1 && <div className="step-connector" />}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button onClick={() => { setEditingSequence(seq); setShowBuilder(true); }} className="btn btn-sm btn-outline">Edit</button>
                    {seq.status === "draft" && <button className="btn btn-sm btn-accent">Activate</button>}
                    {seq.status === "active" && <button className="btn btn-sm btn-outline">Pause</button>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sequence Builder Modal */}
      {showBuilder && (
        <SequenceBuilder
          sequence={editingSequence}
          onClose={() => { setShowBuilder(false); setEditingSequence(null); }}
          onSave={() => { fetchSequences(); setShowBuilder(false); setEditingSequence(null); }}
        />
      )}
    </div>
  );
}

// ─── Sequence Builder ─────────────────────────────────────────

interface StepForm {
  action: string;
  delayDays: number;
  delayHours: number;
  subject: string;
  bodyHtml: string;
  isForward: boolean;
}

function SequenceBuilder({ sequence, onClose, onSave }: { sequence: Sequence | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: sequence?.name || "",
    type: sequence?.type || "cold-outreach",
    description: sequence?.description || "",
  });
  const [steps, setSteps] = useState<StepForm[]>(
    sequence?.steps.sort((a, b) => a.stepOrder - b.stepOrder).map(s => ({
      action: s.action,
      delayDays: s.delayDays,
      delayHours: s.delayHours,
      subject: s.subject || "",
      bodyHtml: s.bodyHtml || "",
      isForward: s.isForward,
    })) || TYPE_CONFIG["cold-outreach"].defaultSteps.map(s => ({
      action: s.action,
      delayDays: s.delayDays,
      delayHours: 0,
      subject: s.subject,
      bodyHtml: "",
      isForward: s.isForward,
    }))
  );
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (type: string) => {
    setForm(f => ({ ...f, type }));
    if (!sequence) {
      setSteps(TYPE_CONFIG[type]?.defaultSteps.map(s => ({
        action: s.action,
        delayDays: s.delayDays,
        delayHours: 0,
        subject: s.subject,
        bodyHtml: "",
        isForward: s.isForward,
      })) || []);
    }
  };

  const addStep = () => {
    setSteps(s => [...s, { action: "send-email", delayDays: 3, delayHours: 0, subject: "", bodyHtml: "", isForward: false }]);
  };
  const removeStep = (i: number) => {
    setSteps(s => s.filter((_, idx) => idx !== i));
  };
  const updateStep = (i: number, updates: Partial<StepForm>) => {
    setSteps(s => s.map((step, idx) => idx === i ? { ...step, ...updates } : step));
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const url = sequence ? `/api/sequences?id=${sequence.id}` : "/api/sequences";
      const method = sequence ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, steps }),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-brand-900">{sequence ? "Edit Sequence" : "Build Sequence"}</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.name} className="btn btn-accent btn-sm">
              {saving ? "Saving..." : "Save Sequence"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Sequence Name *</label>
              <input className="input" placeholder="e.g., Cold Outreach - Enterprise" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Steps</label>
              <button onClick={addStep} className="btn btn-sm btn-outline">+ Add Step</button>
            </div>

            <div className="space-y-0">
              {steps.map((step, i) => (
                <div key={i}>
                  <div className="flex items-start gap-3 card p-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      step.isForward ? "bg-amber-100 text-amber-700" : "bg-brand-100 text-brand-700"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <select className="input text-xs" value={step.isForward ? "send-forward" : "send-email"} onChange={(e) => updateStep(i, { isForward: e.target.value === "send-forward", action: e.target.value })}>
                          <option value="send-email">Send Email</option>
                          <option value="send-forward">Forward (Bump)</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} className="input text-xs w-16" value={step.delayDays} onChange={(e) => updateStep(i, { delayDays: parseInt(e.target.value) || 0 })} />
                          <span className="text-xs text-slate-400 whitespace-nowrap">days delay</span>
                        </div>
                        <button onClick={() => removeStep(i)} className="btn btn-sm btn-ghost text-red-500 justify-self-end">Remove</button>
                      </div>
                      <input className="input text-xs" placeholder="Subject line" value={step.subject} onChange={(e) => updateStep(i, { subject: e.target.value })} />
                      {TYPE_CONFIG[form.type]?.defaultSteps[i]?.hint && (
                        <div className="text-[11px] text-slate-400 italic">{TYPE_CONFIG[form.type].defaultSteps[i].hint}</div>
                      )}
                    </div>
                  </div>
                  {i < steps.length - 1 && <div className="step-connector" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
