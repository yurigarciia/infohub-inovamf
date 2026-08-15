import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import type { JourneyStage, TeamStageHistory } from "@/types";

/** Histórico de transições entre etapas do funil (RF-08, RF-09). */
export function TeamStageHistoryCard({
  stageHistory,
  stages,
}: {
  stageHistory: TeamStageHistory[];
  stages: JourneyStage[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de etapas</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-2 text-sm">
          {stageHistory.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-2">
              <span>
                {stages.find((s) => s.id === entry.stageId)?.name ?? `Etapa ${entry.stageId}`}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(entry.enteredAt)}
                {entry.exitedAt ? ` – ${formatDate(entry.exitedAt)}` : " – atual"}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
