"use client";

import { useEffect, useState } from "react";
import { getJourneyStages } from "@/services";
import type { JourneyStage } from "@/types";

const STAGE_COLORS = [
  "bg-brand-300",
  "bg-brand-400",
  "bg-brand-500",
  "bg-brand-600",
  "bg-brand-700",
  "bg-brand-800",
];

/** As 6 etapas do funil, como um "como funciona" na landing page —
 * mesma escala de marca usada nos badges de etapa em outras telas. */
export function JourneySteps() {
  const [stages, setStages] = useState<JourneyStage[]>([]);

  useEffect(() => {
    getJourneyStages().then(setStages);
  }, []);

  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stages.map((stage, index) => (
        <li key={stage.id} className="flex items-start gap-3 rounded-lg border border-border p-4">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${STAGE_COLORS[index % STAGE_COLORS.length]}`}
          >
            {stage.number}
          </span>
          <span className="text-sm font-medium">{stage.name}</span>
        </li>
      ))}
    </ol>
  );
}
