import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getTokenFromRequest, validateSession } from "~/auth";

const getCurrentUser = createServerFn({ method: "GET" }).handler(async ({ request }) => {
  const token = getTokenFromRequest(request);
  if (!token) throw redirect({ to: "/login" });
  const user = await validateSession(token);
  if (!user) throw redirect({ to: "/login" });
  return user;
});

export const Route = createFileRoute("/dashboard")({
  loader: async () => {
    const user = await getCurrentUser();
    return { user };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useLoaderData();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">GarageLog</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user.email}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.name}
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Your digital garage is ready. Add your first car to get started.
          </p>
        </div>

        {/* Placeholder for future content */}
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center dark:border-gray-600">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
            <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Garage is Empty
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Add your first car to start tracking service history, modifications, and milestones.
          </p>
          <button
            disabled
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white opacity-50"
          >
            Add Car — Coming Soon
          </button>
        </div>
      </main>
    </div>
  );
}