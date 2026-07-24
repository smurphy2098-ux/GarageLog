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

export const Route = createFileRoute("/cars/new")({
  loader: async () => {
    const user = await requireAuth();
    return { user };
  },
  component: AddCarPage,
});

function AddCarPage() {
  const { user } = Route.useLoaderData();
  const [form, setForm] = useState({
    make: "", model: "", year: new Date().getFullYear(), nickname: "",
    vin: "", license_plate: "", color: "#6b7280", mileage: "", notes: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);

    try {
      let image_url = "";

      // Upload image if selected
      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.ok) {
          image_url = uploadData.url;
        } else {
          setErrors([uploadData.error || "Upload failed"]);
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // Create car
      const res = await fetch("/api/cars", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          make: form.make,
          model: form.model,
          year: Number(form.year),
          nickname: form.nickname || undefined,
          vin: form.vin || undefined,
          license_plate: form.license_plate || undefined,
          color: form.color || undefined,
          mileage: form.mileage ? Number(form.mileage) : undefined,
          image_url: image_url || undefined,
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        window.location.href = `/cars/${data.car.id}`;
      } else {
        setErrors(data.errors || ["Failed to create car"]);
      }
    } catch {
      setErrors(["An unexpected error occurred"]);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="min-h-dvh bg-[#0a0a0f]">
      <header className="border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/dashboard" className="text-lg font-bold tracking-tight text-white">
            Garage<span className="text-amber-400">Log</span>
          </a>
          <span className="text-sm text-gray-400">Add a Car</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-2xl font-bold text-white">Add a Car to Your Garage</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">Photo</label>
            <div className="flex items-center gap-4">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-8 w-8 text-white/20" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.41a2.25 2.25 0 0 1 3.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-400 hover:file:bg-amber-500/20"
              />
            </div>
          </div>

          {/* Make & Model */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="make" className="mb-1 block text-sm font-medium text-gray-300">Make *</label>
              <input id="make" name="make" required value={form.make} onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
            <div>
              <label htmlFor="model" className="mb-1 block text-sm font-medium text-gray-300">Model *</label>
              <input id="model" name="model" required value={form.model} onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
          </div>

          {/* Year & Nickname */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="year" className="mb-1 block text-sm font-medium text-gray-300">Year *</label>
              <input id="year" name="year" type="number" required min={1886} max={2028} value={form.year} onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
            <div>
              <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-gray-300">Nickname</label>
              <input id="nickname" name="nickname" value={form.nickname} onChange={handleChange} placeholder="e.g., The Grey Ghost"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
          </div>

          {/* VIN & License Plate */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vin" className="mb-1 block text-sm font-medium text-gray-300">VIN</label>
              <input id="vin" name="vin" value={form.vin} onChange={handleChange} placeholder="17-character VIN"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
            <div>
              <label htmlFor="license_plate" className="mb-1 block text-sm font-medium text-gray-300">License Plate</label>
              <input id="license_plate" name="license_plate" value={form.license_plate} onChange={handleChange}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
          </div>

          {/* Color & Mileage */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="color" className="mb-1 block text-sm font-medium text-gray-300">Color</label>
              <div className="flex items-center gap-3">
                <input id="color" name="color" type="color" value={form.color} onChange={handleChange}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-white/10 bg-transparent" />
                <span className="text-sm text-gray-500">{form.color}</span>
              </div>
            </div>
            <div>
              <label htmlFor="mileage" className="mb-1 block text-sm font-medium text-gray-300">Current Mileage</label>
              <input id="mileage" name="mileage" type="number" value={form.mileage} onChange={handleChange} placeholder="mi"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-300">Notes</label>
            <textarea id="notes" name="notes" rows={3} value={form.notes} onChange={handleChange}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-colors" />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-500 px-8 py-3 font-semibold text-black hover:bg-amber-400 disabled:opacity-50 transition-colors"
            >
              {saving ? (uploading ? "Uploading photo..." : "Saving...") : "Add to Garage"}
            </button>
            <a href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Cancel</a>
          </div>
        </form>
      </main>
    </div>
  );
}