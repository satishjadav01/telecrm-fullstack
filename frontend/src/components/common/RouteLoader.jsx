import { RefreshCw } from "lucide-react";

function RouteLoader({ label = "Loading..." }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full items-center justify-center px-4 py-8">
      <div className="flex w-full max-w-sm flex-col items-center px-5 py-6 text-center">
        <RefreshCw className="animate-spin text-[#1f5f50]" size={26} />
        <p className="mt-3 font-medium">{label}</p>
        <p className="muted mt-1 text-sm">Fetching the latest module data.</p>
      </div>
    </div>
  );
}

export default RouteLoader;
