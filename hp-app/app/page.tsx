import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="max-w-xl w-full p-10 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center">
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">HackPrinceton iMessage Viewer</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          Browse your top conversations and view message history.
        </p>
        <div className="mt-8">
          <Link
            href="/messages"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-black px-5 py-2.5 text-sm font-medium hover:opacity-90 transition"
          >
            Open Messages
          </Link>
        </div>
      </div>
    </main>
  )
}
