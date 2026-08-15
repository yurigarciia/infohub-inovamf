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

/** As 6 etapas do funil, em formato de linha do tempo na landing page
 * — horizontal em telas largas, empilhada em mobile — mesma escala de
 * marca usada nos badges de etapa em outras telas. */
export function JourneySteps() {
  const [stages, setStages] = useState<JourneyStage[]>([]);

  useEffect(() => {
    getJourneyStages().then(setStages);
  }, []);

  return (
    <ol className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-2">
      <div aria-hidden="true" className="absolute top-4 right-4 left-4 hidden h-px bg-border sm:block" />
      {stages.map((stage, index) => (
        <li
          key={stage.id}
          className="relative flex flex-1 flex-row items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center"
        >
          <span
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${STAGE_COLORS[index % STAGE_COLORS.length]}`}
          >
            {stage.number}
          </span>
          <span className="text-sm font-medium">{stage.name}</span>
        </li>
      ))}
    </ol>
  );
}
