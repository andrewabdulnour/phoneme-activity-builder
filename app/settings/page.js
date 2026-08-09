import ThemeSettings from "@/components/ThemeSettingsLoader";

export const metadata = {
  title: "Settings — Phoneme Activity Builder",
};

export default function SettingsPage() {
  return (
    <div className="py-8">
      <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
      <p className="mb-8 max-w-2xl text-slate-600 dark:text-slate-400">
        Interface preferences for teachers using this builder. Choices are saved in cookies on this
        device, so they carry over between sessions without needing an account.
      </p>
      <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <ThemeSettings />
      </div>
    </div>
  );
}
