import ConnectionManager from "@/components/ConnectionManager";

export default function SettingsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Settings</h1>
        <p className="mt-1 text-text-muted text-sm">
          Manage your connections and API keys.
        </p>
      </div>
      <ConnectionManager workspaceId="demo-workspace" />
    </main>
  );
}
