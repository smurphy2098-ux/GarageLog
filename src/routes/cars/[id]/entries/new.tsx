import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getTokenFromRequest } from "~/auth-client";

const requireAuth = createServerFn({ method: "GET" }).handler(async ({ request }) => {
  const token = getTokenFromRequest(request);
  if (!token) throw redirect({ to: "/login" });
  const { validateSession } = await import("~/auth");
  const user = await validateSession(token);
  if (!user) throw redirect({ to: "/login" });
  return user;
});

export const Route = createFileRoute("/cars/id/entries/new")({
  loader: async () => {
    const user = await requireAuth();
    return { user };
  },
  component: AddEntryPage,
});

function AddEntryPage() {
  const { id } = Route.useParams();
  const [step, setStep] = useState<"form" | "scanning" | "review" | "saving">("form");
  const [entryType, setEntryType] = useState("service");
  const [form, setForm] = useState({
    title: "", description: "", date: "", mileage: "", cost: "", vendor: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  const handleReceiptUpload = async (file: File) => {
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setStep("scanning");
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/ai/extract-receipt", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok && data.extraction) {
        setExtraction(data.extraction);
        // Auto-fill form from extraction
        setForm({
          title: `Service at ${data.extraction.vendor}`,
          description: data.extraction.items?.map((i: any) =>
            `${i.name} x${i.quantity} @ $${i.unit_price}`
          ).join(", ") || "",
          date: data.extraction.date || "",
          mileage: "",
          cost: data.extraction.total?.toString() || "",
          vendor: data.extraction.vendor || "",
        });
        setStep("review");
      } else {
        setErrors(["Failed to extract data from receipt"]);
        setStep("form");
      }
    } catch {
      setErrors(["An error occurred during extraction"]);
      setStep("form");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleReceiptUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("saving");
    setErrors([]);

    try {
      const body: any = {
        entry_type: entryType,
        title: form.title,
        description: form.description || undefined,
        mileage: form.mileage ? Number(form.mileage) : undefined,
        date: form.date || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        vendor: form.vendor || undefined,
      };

      if (extraction) {
        body.ai_extracted_data = extraction;
      }

      const res = await fetch(`/api/cars/${id}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => { window.location.href = `/cars/${id}`; }, 1500);
      } else {
        setErrors(data.errors || ["Failed to save entry"]);
        setStep("review");
      }
    } catch {
      setErrors(["An error occurred"]);
      setStep("review");
    }
  };

  if (success) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">Entry saved!</h2>
          <p className="text-gray-400">Redirecting to your car's timeline...</p>
        </div>
      </div>
    );
  }

  const entryTypeColors: Record<string, string> = {
    service: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    modification: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    milestone: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    other: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0f]">
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href={`/cars/${id}`} className="flex items-center gap-2 text-lg font-bold text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Garage<span className="text-amber-400">Log</span>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-2xl font-bold text-white">Add Entry</h1>

        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {["form", "scanning", "review"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? "bg-amber-500 text-black" :
                step === "review" && i < 2 || step === "saving" ? "bg-emerald-500/20 text-emerald-400" :
                "bg-white/5 text-gray-500"
              }`}>
                {step === "saving" || (step === "review" && i < 2) ? "✓" : i + 1}
              </div>
              <span className="text-xs capitalize text-gray-500">{s === "form" ? "Upload" : s}</span>
              {i < 2 && <div className="h-px w-8 bg-white/5" />}
            </div>
          ))}
        </div>

        {step === "scanning" && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <h3 className="text-lg font-semibold text-white">Scanning Receipt...</h3>
            <p className="mt-1 text-sm text-gray-400">AI is extracting vendor, items, and totals from your receipt.</p>
          </div>
        )}

        {/* Receipt preview + review */}
        {step === "review" && extraction && (
          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 text-sm font-medium text-gray-400">Receipt Preview</h3>
              {receiptPreview && (
                <img src={receiptPreview} alt="Receipt" className="w-full rounded-lg border border-white/5" />
              )}
              <div className="mt-3 space-y-2">
                <ConfidenceBar label="Vendor" value={extraction.confidence?.vendor} />
                <ConfidenceBar label="Date" value={extraction.confidence?.date} />
                <ConfidenceBar label="Total" value={extraction.confidence?.total} />
                <ConfidenceBar label="Items" value={extraction.confidence?.items} />
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h3 className="mb-3 text-sm font-medium text-emerald-400">Extracted Data</h3>
              <div className="space-y-2 text-sm text-gray-400">
                <p><span className="text-gray-500">Vendor:</span> {extraction.vendor}</p>
                <p><span className="text-gray-500">Date:</span> {extraction.date}</p>
                <p><span className="text-gray-500">Total:</span> ${extraction.total?.toLocaleString()}</p>
                <p className="text-gray-500">Items ({extraction.items?.length || 0}):</p>
                <ul className="ml-4 list-disc text-xs">
                  {extraction.items?.map((item: any, i: number) => (
                    <li key={i}>{item.name} x{item.quantity} @ ${item.unit_price}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {(step === "form" || step === "review" || step === "saving") && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Receipt upload */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Receipt / Invoice Photo</label>
              <div className="flex items-center gap-4">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                  {receiptPreview ? (
                    <img src={receiptPreview} alt="Receipt" className="h-full w-full object-cover" />
                  ) : (
                    <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  )}
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange}
                  className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-400 hover:file:bg-amber-500/20" />
              </div>
              <p className="mt-1 text-xs text-gray-500">AI will scan your receipt and auto-fill the form.</p>
            </div>

            {/* Type selector */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">Entry Type</label>
              <div className="flex flex-wrap gap-2">
                {["service", "modification", "milestone", "other"].map((t) => (
                  <button key={t} type="button" onClick={() => setEntryType(t)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                      entryType === t ? entryTypeColors[t] + " border-current" : "border-white/10 text-gray-500 hover:border-white/20"
                    }`}
                  >
                    {t === "service" && "🔧 "}{t === "modification" && "⚡ "}{t === "milestone" && "🏆 "}{t === "other" && "📝 "}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="mb-1 block text-sm font-medium text-gray-300">Title *</label>
              <input id="title" required value={form.title}
                onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
            </div>

            {/* Date + Mileage */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="mb-1 block text-sm font-medium text-gray-300">Date</label>
                <input id="date" type="date" value={form.date}
                  onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label htmlFor="mileage" className="mb-1 block text-sm font-medium text-gray-300">Mileage</label>
                <input id="mileage" type="number" value={form.mileage}
                  onChange={(e) => setForm(p => ({ ...p, mileage: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
            </div>

            {/* Cost + Vendor */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cost" className="mb-1 block text-sm font-medium text-gray-300">Cost ($)</label>
                <input id="cost" type="number" step="0.01" value={form.cost}
                  onChange={(e) => setForm(p => ({ ...p, cost: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
              <div>
                <label htmlFor="vendor" className="mb-1 block text-sm font-medium text-gray-300">Vendor / Shop</label>
                <input id="vendor" value={form.vendor}
                  onChange={(e) => setForm(p => ({ ...p, vendor: e.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-300">Description</label>
              <textarea id="description" rows={3} value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50" />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center gap-4">
              <button type="submit" disabled={step === "saving"}
                className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors">
                {step === "saving" ? "Saving..." : "Save Entry"}
              </button>
              <a href={`/cars/${id}`} className="text-sm text-gray-500 hover:text-gray-300">Cancel</a>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

/** Confidence bar component */
function ConfidenceBar({ label, value }: { label: string; value?: number }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-gray-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/5">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 text-right font-mono ${pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
    </div>
  );
}