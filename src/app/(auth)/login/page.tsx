"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ? `${data.error}: ${data.detail} [dbUrl: ${data.dbUrl}]` : data.error || "Login failed");
        return;
      }
      router.push("/");
    } catch (err) {
      setError(`Something went wrong: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedResult("");
    try {
      // Register a demo user
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Demo User", email: "demo@sandbox.com", password: "demo123" }),
      });
      if (!regRes.ok) {
        const data = await regRes.json();
        if (data.error?.includes("already exists")) {
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "demo@sandbox.com", password: "demo123" }),
          });
          if (!loginRes.ok) {
            const loginData = await loginRes.json();
            setSeedResult(`Login failed: ${loginData.detail || loginData.error} [dbUrl: ${loginData.dbUrl}]`);
            setSeeding(false);
            return;
          }
        } else {
          setSeedResult(`Register failed: ${data.detail || data.error} [dbUrl: ${data.dbUrl}]`);
          setSeeding(false);
          return;
        }
      }
      // Seed data for the logged-in user
      const seedRes = await fetch("/api/seed", { method: "POST" });
      const seedData = await seedRes.json();
      if (!seedRes.ok) {
        setSeedResult(`Seed failed: ${seedData.detail || seedData.error} [dbUrl: ${seedData.dbUrl}]`);
        setSeeding(false);
        return;
      }
      setSeedResult(`Loaded ${seedData.contacts} contacts, ${seedData.templates} templates`);
      // Redirect after a moment
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setSeedResult("Failed to load demo data");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-accent-600 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Sandbox Outreach</h1>
        <p className="text-brand-300 text-sm mt-1">Sign in to your account</p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="card p-6 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="label">Password</label>
          <input
            type="password"
            className="input"
            placeholder="Enter your password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-accent w-full">
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent-600 font-medium hover:text-accent-700">
            Create one
          </Link>
        </div>
      </form>

      {/* Demo Data Button */}
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-brand-900 px-3 text-xs text-brand-400">or try a demo</span>
          </div>
        </div>
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="mt-4 w-full btn bg-brand-800 text-brand-200 hover:bg-brand-700 border border-brand-600"
        >
          {seeding ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              Loading...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Load Sample Data
            </>
          )}
        </button>
        {seedResult && (
          <div className="mt-2 text-center text-xs text-brand-300">{seedResult}</div>
        )}
      </div>
    </div>
  );
}
