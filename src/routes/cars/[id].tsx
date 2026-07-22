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
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const loadCar = () => {
    setLoading(true);
    fetch(`/api/cars/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCar(); }, [id]);

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

  // Group entries by month/year
  const groupedEntries = entries.reduce((groups: Record<string, any[]>, entry: any) => {
    const d = entry.date ? new Date(entry.date) : new Date(entry.created_at);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {});

  return (
    <div className="min-h-dvh bg-[#0a0a0f]">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <a href="/dashboard" className="flex items-center gap-2 text-lg font-bold text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Garage<span className="text-amber-400">Log</span>
          </a>
          <a
            href={`/cars/${id}/entries/new`}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-400 transition-colors"
          >
            + Add Entry
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-16">
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
                    </span>
                  )}
                  {car.mileage && <span>{Number(car.mileage).toLocaleString()} mi</span>}
                </div>
              </div>
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

        {/* Timeline */}
        <h2 className="mb-6 text-xl font-bold text-white">Timeline</h2>
        {entries.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-white/10 p-12 text-center">
            <p className="text-gray-500">No entries yet.</p>
            <a href={`/cars/${id}/entries/new`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-semibold text-black hover:bg-amber-400 transition-colors">
              Add Your First Entry
            </a>
          </div>
        ) : (
          <div className="relative space-y-12">
            {/* Timeline line */}
            <div className="absolute left-[23px] top-0 h-full w-0.5 bg-gradient-to-b from-amber-500/30 via-white/5 to-transparent" />

            {Object.entries(groupedEntries).map(([monthYear, monthEntries]) => (
              <div key={monthYear}>
                {/* Month/year divider */}
                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-xs font-bold text-amber-400">
                    {new Date(monthYear).toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300">{monthYear}</h3>
                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <div className="space-y-3">
                  {monthEntries.map((entry: any) => {
                    const isExpanded = expandedEntry === entry.id;
                    return (
                      <div key={entry.id} className="relative pl-14">
                        {/* Dot on timeline */}
                        <div className={`absolute left-[6px] top-4 z-10 h-3 w-3 rounded-full border-2 ${
                          entry.entry_type === "service" ? "border-blue-400 bg-blue-500" :
                          entry.entry_type === "modification" ? "border-purple-400 bg-purple-500" :
                          entry.entry_type === "milestone" ? "border-emerald-400 bg-emerald-500" :
                          "border-gray-400 bg-gray-500"
                        }`} />

                        {/* Entry card */}
                        <div
                          onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                          className={`card-gradient card-border group cursor-pointer rounded-xl p-4 transition-all hover:border-white/10 ${
                            isExpanded ? "border-amber-500/20 bg-amber-500/5" : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${entryTypeColors[entry.entry_type] || entryTypeColors.other}`}>
                                  {entryTypeIcons[entry.entry_type]} {entry.entry_type}
                                </span>
                              </div>
                              <h4 className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                                {entry.title}
                              </h4>
                            </div>
                            <div className="shrink-0 text-right text-xs text-gray-500">
                              {entry.date && <p>{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>}
                              {entry.mileage && <p>{Number(entry.mileage).toLocaleString()} mi</p>}
                            </div>
                          </div>

                          {/* Expanded details */}
                          {isExpanded && (
                            <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                              {entry.description && (
                                <p className="text-sm leading-relaxed text-gray-400">{entry.description}</p>
                              )}
                              <div className="flex flex-wrap gap-4 text-sm">
                                {entry.cost && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">💰</span>
                                    <span className="font-medium text-amber-400">${Number(entry.cost).toLocaleString()}</span>
                                  </div>
                                )}
                                {entry.vendor && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-500">🏪</span>
                                    <span className="text-gray-300">{entry.vendor}</span>
                                  </div>
                                )}
                              </div>
                              {/* AI-extracted data */}
                              {entry.ai_extracted_data && (
                                <div className="rounded-lg border border-amber-500/10 bg-amber-500/5 p-3">
                                  <p className="mb-2 text-xs font-medium text-amber-400">🤖 AI Extracted Data</p>
                                  <div className="space-y-1 text-xs text-gray-500">
                                    {entry.ai_extracted_data.items?.map((item: any, i: number) => (
                                      <p key={i}>{item.name} ×{item.quantity} @ ${item.unit_price}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {/* Receipt thumbnail */}
                              {entry.receipt_image_url && (
                                <img src={entry.receipt_image_url} alt="Receipt"
                                  className="w-full max-w-xs rounded-lg border border-white/5" />
                              )}
                            </div>
                          )}

                          {/* Collapsed summary */}
                          {!isExpanded && (
                            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                              {entry.cost && <span className="text-amber-400">${Number(entry.cost).toLocaleString()}</span>}
                              {entry.vendor && <span>{entry.vendor}</span>}
                              {entry.description && (
                                <span className="truncate max-w-[200px]">{entry.description}</span>
                              )}
                              {entry.ai_extracted_data && (
                                <span className="text-amber-500/60">🤖 AI scanned</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}