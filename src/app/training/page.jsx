import { Suspense } from "react";
import TrainingPage from "./TrainingClient";

export const dynamic = "force-dynamic"; // avoid prerender issues for query-string pages

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading…</div>}>
      <TrainingPage />
    </Suspense>
  );
}
