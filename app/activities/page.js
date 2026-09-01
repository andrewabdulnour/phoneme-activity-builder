import ActivityManager from "@/components/ActivityManager";

export const metadata = {
  title: "Activities — Phoneme Activity Builder",
};

export default function ActivitiesPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Activities</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Save Wordle and Word Search configurations against a stored word list, then generate the
        downloadable standalone HTML file straight from the database. Editing the underlying word
        list changes what the next generated file contains — the activity output is data-driven.
      </p>
      <div className="mt-6">
        <ActivityManager />
      </div>
    </div>
  );
}
