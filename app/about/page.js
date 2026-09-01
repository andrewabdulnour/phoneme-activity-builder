export const metadata = {
  title: "About — Phoneme Activity Builder",
};

// Replace with your unlisted/public video URL before submission, e.g.
// "https://www.youtube.com/embed/XXXXXXXXXXX"
const VIDEO_EMBED_URL = "";

export default function AboutPage() {
  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">About this project</h1>

      <section className="mt-4 max-w-3xl space-y-3 text-slate-600 dark:text-slate-300">
        <p>
          This is <strong>Assessment 2: Full-stack cloud application implementation</strong> for a
          phoneme activity builder aimed at Speech Pathology students and teachers. It continues
          directly from Assessment 1 (frontend design and usability): the interface is unchanged in
          purpose, but the app is now data-driven.
        </p>
        <p>
          <strong>Assessment 2 adds the backend and database layer.</strong> Teachers create and
          manage phoneme-based word lists and saved activity configurations, all persisted through a
          Prisma + SQLite database and a REST API (<code>/api/word-lists</code>,{" "}
          <code>/api/words</code>, <code>/api/activities</code>). The Wordle and Word Search
          downloads can now be generated from stored data rather than a single hard-coded example,
          and the whole app runs inside a Docker container with a <code>/health</code> check.
        </p>
        <p>
          The builder supports two activities: a <strong>Wordle</strong> game that uses a single
          phoneme-based target word, and a <strong>Word Search</strong> built from a list of
          phoneme-based words. Both are designed around phoneme symbols — hovering any tile shows
          its phonetic-to-English letter equivalence — and both can be exported as a single
          downloadable HTML file that runs in any browser.
        </p>
        <p>
          The on-screen phoneme keyboard, IPA transcriptions and word corpus (90 words across 3, 4
          and 5-phoneme sets) follow the unit&apos;s HCE (broad Australian English) phoneme
          materials. Phoneme length doubles as the difficulty control — more phonemes to blend or
          segment is a developmentally meaningful difficulty axis for speech pathology practice,
          rather than an arbitrary guess limit.
        </p>
      </section>

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Submission details</h2>
        <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="font-medium text-slate-500 dark:text-slate-400">Name</dt>
          <dd className="text-slate-800 dark:text-slate-200">Andrew Abdulnour</dd>
          <dt className="font-medium text-slate-500 dark:text-slate-400">Student number</dt>
          <dd className="text-slate-800 dark:text-slate-200">20719271</dd>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Video walkthrough
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          A short video explaining how to use this site.
        </p>
        <div className="mt-3 aspect-video max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
          {VIDEO_EMBED_URL ? (
            <iframe
              src={VIDEO_EMBED_URL}
              title="Walkthrough video"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <span className="font-medium">Video not yet linked</span>
              <span>
                Set <code>VIDEO_EMBED_URL</code> in{" "}
                <code>app/about/page.js</code> once the walkthrough video is uploaded.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
