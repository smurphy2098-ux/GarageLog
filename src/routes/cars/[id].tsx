import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { getTokenFromRequest, validateSession } from "~/auth";

const requireAuth = createServerFn({ method: "GET" }).handler(async ({ request }) => {
  const token = getTokenFromRequest(request);
  if (!token) throw redirect({ to: "/login" });
  const user = await validateSession(token);
  if (!user) throw redirect({ to: "/login" });
  return user;
});

export const Route = createFileRoute("/cars/$id")({
  loader: async () => {
    const user = await requireAuth();
    return { user };
  },
  component: CarDetailPage,
});

function CarDetailPage() {
  const { user } = Route.useLoaderData();
  const { id } = Route.useParams();
  const [data, setData] = useState<{
    car: any; entries: any[]; stats: { entry_count: number; total_spent: number; miles_driven: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState({
    entry_type: "service", title: "", description: "", mileage: "", date: "", cost: "", vendor: "",
  });
  const [saving, setSaving] = useState(false);
  const [entryErrors, setEntryErrors] = useState<string[]>([]);

  const loadCar = () => {
    setLoading(true);
    fetch(`/api/cars/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCar(); }, [id]);

  const handleEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEntryErrors([]);
    try {
      const res = await fetch(`/api/cars/${id}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entry_type: entryForm.entry_type,
          title: entryForm.title,
          description: entryForm.description || undefined,
          mileage: entryForm.mileage ? Number(entryForm.mileage) : undefined,
          date: entryForm.date || undefined,
          cost: entryForm.cost ? Number(entryForm.cost) : undefined,
          vendor: entryForm.vendor || undefined,
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setShowEntryForm(false);
        setEntryForm({ entry_type: "service", title: "", description: "", mileage: "", date: "", cost: "", vendor: "" });
        loadCar();
      } else {
        setEntryErrors(d.errors || ["Failed to create entry"]);
      }
    } catch { setEntryErrors(["An error occurred"]); }
    finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0f]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0f]">
        <p className="text-gray-400">Car not found</p>
        <a href="/dashboard" className="text-amber-400 hover:text-amber-300">Back to Garage</a>
      </div>
    );
  }

  const { car, entries, stats } = data;

  const entryTypeColors: Record<string, string> = {
    service: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    modification: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    milestone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  const entryTypeIcons: Record<string, string> = {
    service: "🔧", modification: "⚡", milestone: "🏆", other: "📝",
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Garage<span className="text-amber-400">Log</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Car hero */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-white/5">
          <div className="aspect-[21/9] bg-white/5">
            {car.image_url ? (
              <img src={car.image_url} alt={`${car.make} ${car.model}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg className="h-24 w-24 text-white/5" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {car.nickname || `${car.year} ${car.make} ${car.model}`}
                </h1>
                {car.nickname && <p className="text-lg text-gray-500">{car.year} {car.make} {car.model}</p>}
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                  {car.vin && <span>VIN: {car.vin}</span>}
                  {car.license_plate && <span>Plate: {car.license_plate}</span>}
                  {car.color && (
                    <span className="flex items-center gap-1">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: car.color }} />
                      {car.color}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowEntryForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Entry
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="card-gradient card-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.entry_count}</p>
            <p className="text-xs text-gray-500">Entries</p>
          </div>
          <div className="card-gradient card-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">${Number(stats.total_spent).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
          <div className="card-gradient card-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{Number(stats.miles_driven).toLocaleString()}</p>
            <p className="text-xs text-gray-500">Miles Tracked</p>
          </div>
        </div>

        {/* Add Entry Form */}
        {showEntryForm && (
          <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">New Entry</h3>
            <form onSubmit={handleEntrySubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Type</label>
                  <select name="entry_type" value={entryForm.entry_type}
                    onChange={(e) => setEntryForm((p) => ({ ...p, entry_type: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50">
                    <option value="service">Service</option>
                    <option value="modification">Modification</option>
                    <option value="milestone">Milestone</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Date</label>
                  <input type="date" value={entryForm.date}
                    onChange={(e) => setEntryForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Title *</label>
                <input required value={entryForm.title}
                  onChange={(e) => setEntryForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
                <textarea rows={2} value={entryForm.description}
                  onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Mileage</label>
                  <input type="number" value={entryForm.mileage}
                    onChange={(e) => setEntryForm((p) => ({ ...p, mileage: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Cost ($)</label>
                  <input type="number" step="0.01" value={entryForm.cost}
                    onChange={(e) => setEntryForm((p) => ({ ...p, cost: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-300">Vendor</label>
                  <input value={entryForm.vendor}
                    onChange={(e) => setEntryForm((p) => ({ ...p, vendor: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
                </div>
              </div>
              {entryErrors.length > 0 && (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {entryErrors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-amber-500 px-6 py-2.5 font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors">
                  {saving ? "Saving..." : "Save Entry"}
                </button>
                <button type="button" onClick={() => setShowEntryForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Timeline */}
        <h2 className="mb-4 text-xl font-bold text-white">Timeline</h2>
        {entries.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-white/10 p-12 text-center">
            <p className="text-gray-500">No entries yet. Add your first service, mod, or milestone.</p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 h-full w-0.5 bg-white/5" />
            {entries.map((entry: any) => (
              <div key={entry.id} className="relative flex gap-4 pb-8">
                {/* Dot */}
                <div className={`relative z-10 mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm ${entryTypeColors[entry.entry_type] || entryTypeColors.other}`}>
                  {entryTypeIcons[entry.entry_type] || "📝"}
                </div>
                {/* Card */}
                <div className="card-gradient card-border group flex-1 rounded-xl p-4 transition-all hover:border-white/10">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-white">{entry.title}</h3>
                      <p className="text-xs text-gray-500 capitalize">{entry.entry_type}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {entry.date && <p>{new Date(entry.date).toLocaleDateString()}</p>}
                      {entry.mileage && <p>{Number(entry.mileage).toLocaleString()} mi</p>}
                    </div>
                  </div>
                  {entry.description && (
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">{entry.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                    {entry.cost && <span>💰 ${Number(entry.cost).toLocaleString()}</span>}
                    {entry.vendor && <span>🏪 {entry.vendor}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}