import ConnectionManager from "@/components/ConnectionManager";

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-gray-500 text-sm">
          Manage your connections and API keys.
        </p>
      </div>
      <ConnectionManager workspaceId="demo-workspace" />
    </main>
  );
}
