"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  title: string | null;
  phone: string | null;
  type: string;
  status: string;
  leadScore: number;
  source: string | null;
  tags: string;
  notes: string | null;
  createdAt: string;
}

const TYPE_BADGE: Record<string, string> = {
  customer: "badge-blue",
  lead: "badge-amber",
  partner: "badge-teal",
  prospect: "badge-purple",
};
const STATUS_BADGE: Record<string, string> = {
  active: "badge-green",
  unsubscribed: "badge-slate",
  bounced: "badge-red",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (search) params.set("search", search);
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, search]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const toggleSelect = (id: string) => {
    setSelectedContacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedContacts.size === contacts.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(contacts.map(c => c.id)));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contacts</h1>
          <p className="page-subtitle">Manage your CRM database — customers, leads, partners, and prospects</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="btn btn-outline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import
          </button>
          <button onClick={() => setShowAdd(true)} className="btn btn-accent">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 flex-wrap">
          {[
            { value: "all", label: "All" },
            { value: "customer", label: "Customers" },
            { value: "lead", label: "Leads" },
            { value: "partner", label: "Partners" },
            { value: "prospect", label: "Prospects" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterType(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === f.value
                  ? "bg-brand-800 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input py-1.5 text-xs"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedContacts.size > 0 && (
        <div className="card p-3 flex items-center gap-3 bg-brand-50 border-brand-200">
          <span className="text-sm font-medium text-brand-800">{selectedContacts.size} selected</span>
          <button className="btn btn-sm btn-outline">Add to Segment</button>
          <button className="btn btn-sm btn-outline">Add to Campaign</button>
          <button className="btn btn-sm btn-outline">Export</button>
          <button onClick={() => setSelectedContacts(new Set())} className="btn btn-sm btn-ghost text-slate-500">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <div className="text-sm font-medium text-slate-600 mb-1">No contacts yet</div>
            <div className="text-xs text-slate-400 mb-4">Import a CSV or add contacts manually to get started</div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setShowImport(true)} className="btn btn-sm btn-outline">Import CSV</button>
              <button onClick={() => setShowAdd(true)} className="btn btn-sm btn-accent">Add Contact</button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={selectedContacts.size === contacts.length && contacts.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setOpenContact(c); }}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedContacts.has(c.id)} onChange={() => toggleSelect(c.id)} className="rounded border-slate-300" />
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <span className="font-medium text-slate-800">{c.firstName} {c.lastName}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-slate-600">{c.email}</td>
                    <td className="text-slate-600">{c.company || "—"}</td>
                    <td><span className={`badge ${TYPE_BADGE[c.type] || "badge-slate"}`}>{c.type}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] || "badge-slate"}`}>{c.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${Math.min(c.leadScore, 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 font-mono">{c.leadScore}</span>
                      </div>
                    </td>
                    <td className="text-xs text-slate-500">{c.source || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={fetchContacts} />}

      {/* Add Contact Modal */}
      {showAdd && <AddContactModal onClose={() => setShowAdd(false)} onSave={fetchContacts} />}

      {/* Contact Detail / Edit Panel */}
      {openContact && createPortal(
        <ContactDetailPanel
          contact={openContact}
          onClose={() => setOpenContact(null)}
          onSave={() => { fetchContacts(); setOpenContact(null); }}
          onDelete={() => { fetchContacts(); setOpenContact(null); }}
        />,
        document.body
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: () => void }) {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: number } | null>(null);
  const [importType, setImportType] = useState("lead");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, contactType: importType }),
      });
      const data = await res.json();
      setResult({ imported: data.imported || 0, errors: data.errors || 0 });
      onImport();
    } catch {
      setResult({ imported: 0, errors: 1 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-brand-900">Import Contacts</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {result ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div className="text-sm font-medium text-slate-700">{result.imported} contacts imported</div>
            {result.errors > 0 && <div className="text-xs text-red-500 mt-1">{result.errors} rows had errors</div>}
            <button onClick={onClose} className="btn btn-accent mt-4">Done</button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="label">Contact Type</label>
              <select value={importType} onChange={(e) => setImportType(e.target.value)} className="input">
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="label">Upload CSV File</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-accent-400 transition-colors">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <div className="text-sm text-slate-600 font-medium">Drop a CSV file or click to browse</div>
                  <div className="text-xs text-slate-400 mt-1">Required columns: firstName, lastName, email</div>
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Or paste CSV data</label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="firstName,lastName,email,company,title&#10;John,Doe,john@example.com,Acme Inc,VP Sales"
                className="input h-32 font-mono text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-slate-400">
                Supports CSV with headers: firstName, lastName, email, company, title, phone, tags
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn btn-ghost">Cancel</button>
                <button onClick={handleImport} disabled={!csvText.trim() || importing} className="btn btn-accent">
                  {importing ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Add Contact Modal ─────────────────────────────────────────

function AddContactModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", company: "", title: "", phone: "", type: "lead" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.email) return;
    setSaving(true);
    try {
      await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "manual" }),
      });
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-brand-900">Add Contact</h3>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Company</label>
              <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="lead">Lead</option>
                <option value="customer">Customer</option>
                <option value="partner">Partner</option>
                <option value="prospect">Prospect</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.firstName || !form.email} className="btn btn-accent">
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Detail / Edit Panel ──────────────────────────────

function ContactDetailPanel({
  contact,
  onClose,
  onSave,
  onDelete,
}: {
  contact: Contact;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    company: contact.company || "",
    title: contact.title || "",
    phone: contact.phone || "",
    type: contact.type,
    status: contact.status,
    leadScore: contact.leadScore,
    notes: contact.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/contacts?id=${contact.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await fetch(`/api/contacts?id=${contact.id}`, { method: "DELETE" });
    onDelete();
  };

  const tags: string[] = (() => {
    try { return JSON.parse(contact.tags || "[]"); } catch { return []; }
  })();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
              {contact.firstName[0]}{contact.lastName[0]}
            </div>
            <div>
              {editing ? (
                <div className="flex gap-2">
                  <input
                    className="input py-1 text-sm w-28"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="First"
                  />
                  <input
                    className="input py-1 text-sm w-28"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Last"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-base font-bold text-brand-900">{contact.firstName} {contact.lastName}</h3>
                  <p className="text-xs text-slate-500">{contact.title || ""}{contact.title && contact.company ? " at " : ""}{contact.company || ""}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn btn-sm btn-outline">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Status badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <>
                <select className="input py-1 text-xs w-28" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="partner">Partner</option>
                  <option value="prospect">Prospect</option>
                </select>
                <select className="input py-1 text-xs w-32" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="bounced">Bounced</option>
                </select>
              </>
            ) : (
              <>
                <span className={`badge ${TYPE_BADGE[contact.type] || "badge-slate"}`}>{contact.type}</span>
                <span className={`badge ${STATUS_BADGE[contact.status] || "badge-slate"}`}>{contact.status}</span>
                {tags.length > 0 && tags.map((t, i) => (
                  <span key={i} className="badge badge-slate">{t}</span>
                ))}
              </>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Email</div>
                {editing ? (
                  <input className="input text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                ) : (
                  <a href={`mailto:${contact.email}`} className="text-sm font-mono text-brand-600 hover:underline">{contact.email}</a>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Phone</div>
                {editing ? (
                  <input className="input text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
                ) : (
                  <div className="text-sm text-slate-700">{contact.phone || "—"}</div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Company</div>
                {editing ? (
                  <input className="input text-sm" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                ) : (
                  <div className="text-sm text-slate-700">{contact.company || "—"}</div>
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Title</div>
                {editing ? (
                  <input className="input text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                ) : (
                  <div className="text-sm text-slate-700">{contact.title || "—"}</div>
                )}
              </div>
            </div>
          </div>

          {/* Lead Score */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Lead Score</h4>
            {editing ? (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.leadScore}
                  onChange={(e) => setForm({ ...form, leadScore: parseInt(e.target.value) })}
                  className="flex-1 accent-accent-600"
                />
                <span className="text-sm font-mono font-bold text-brand-900 w-8 text-right">{form.leadScore}</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(contact.leadScore, 100)}%`,
                      backgroundColor: contact.leadScore >= 70 ? "#059669" : contact.leadScore >= 40 ? "#f97c0a" : "#94a3b8",
                    }}
                  />
                </div>
                <span className="text-sm font-mono font-bold text-brand-900">{contact.leadScore}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</h4>
            {editing ? (
              <textarea
                className="input h-24 text-sm resize-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Add notes about this contact..."
              />
            ) : (
              <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 min-h-[3rem]">
                {contact.notes || <span className="text-slate-400 italic">No notes</span>}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-400">Source</div>
                <div className="text-slate-700">{contact.source || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Added</div>
                <div className="text-slate-700">{new Date(contact.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Contact ID</div>
                <div className="font-mono text-xs text-slate-500">{contact.id.slice(0, 8)}...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200">
          {editing ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-sm text-red-600 hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="btn btn-sm btn-ghost">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.firstName || !form.email} className="btn btn-sm btn-accent">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-sm btn-outline flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Send Email
              </button>
              <button className="btn btn-sm btn-outline flex-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Add to Sequence
              </button>
            </div>
          )}

          {/* Delete Confirmation */}
          {confirmDelete && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="text-sm font-medium text-red-800 mb-2">Delete this contact?</div>
              <div className="text-xs text-red-600 mb-3">This will permanently remove {contact.firstName} {contact.lastName} and all associated data.</div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmDelete(false)} className="btn btn-sm btn-ghost">Cancel</button>
                <button onClick={handleDelete} className="btn btn-sm btn-danger">Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
