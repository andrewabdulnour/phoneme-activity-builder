import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-10">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 dark:border-indigo-950 dark:from-slate-900 dark:to-slate-950">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Phoneme Activity Builder</h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          A classroom activity builder for Speech Pathology teachers. Configure a phoneme-based{" "}
          <strong>Wordle</strong> or <strong>Word Search</strong> game, preview it, and generate a
          single downloadable HTML file that runs in any web browser — no installs, no accounts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/wordle"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700"
          >
            Build a Wordle activity
          </Link>
          <Link
            href="/word-search"
            className="rounded-lg border border-indigo-600 px-5 py-2.5 font-semibold text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            Build a Word Search
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            View dashboard
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-5 sm:grid-cols-2">
        <FeatureCard
          title="Phoneme-first design"
          body="Both activities are built around phoneme symbols, not standard spelling entry. Hover any tile to see its phonetic-to-English letter equivalence."
        />
        <FeatureCard
          title="Preview, then generate"
          body="Configure the target sound and difficulty, try the activity live in the builder, then export it as a single .html file ready for the classroom."
        />
        <FeatureCard
          title="Works anywhere"
          body="Generated files are self-contained — no server, database, or internet connection required to run them in a browser."
        />
        <FeatureCard
          title="Monitored and reported"
          body="Every generation, page visit and change is recorded. The Dashboard shows live health, usage statistics and alerts; Reports chart usage over time."
        />
      </section>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-600 dark:text-slate-300">
          <li>Open the Wordle or Word Search builder from the navigation bar.</li>
          <li>Choose a focus phoneme and a difficulty or grid size.</li>
          <li>Preview the activity directly in the browser.</li>
          <li>
            Click <strong>Generate</strong> to download a standalone HTML file you can open in any
            browser or share with students.
          </li>
        </ol>
      </section>
    </div>
  );
}

function FeatureCard({ title, body }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}
