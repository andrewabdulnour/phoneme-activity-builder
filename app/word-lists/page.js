import WordListManager from "@/components/WordListManager";

export const metadata = {
  title: "Word Lists — Phoneme Activity Builder",
};

export default function WordListsPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Word lists</h1>
      <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-400">
        Create and manage phoneme-based word lists. Each word stores its phonemes as ordered
        symbols (multi-character tokens like <code>tʃ</code> count as one), so lists can drive the
        Wordle and Word Search generators instead of the fixed corpus. All changes are saved to the
        database through the REST API.
      </p>
      <div className="mt-6">
        <WordListManager />
      </div>
    </div>
  );
}
