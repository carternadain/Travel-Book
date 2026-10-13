import { Suspense } from "react";
import { Planner } from "@/components/Planner";

export const metadata = { title: "Plan a trip · Travel Book" };

export default function PlanPage() {
  return (
    <Suspense>
      <Planner />
    </Suspense>
  );
}
