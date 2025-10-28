"use client"

import { useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      // Replace the URL below with your real auth endpoint when available.
      const res = await fetch(process.env.API_URL + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      // On success, you might redirect to dashboard. For now show a console message.
      // Example: router.push('/dashboard')
      console.log("Login successful");
    } catch (err) {
      setError("Network error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md mx-4">
        <div className="bg-white dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Sign in to your account</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">Enter your email and password to continue.</p>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300 p-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-200">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-transparent py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm text-gray-700 dark:text-gray-200">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-transparent py-2 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your password"
                required
              />
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 font-medium disabled:opacity-60"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
