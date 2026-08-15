import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TeamDetail } from "@/types";

/** Cabeçalho da página de detalhe da equipe: nome, badge "pronta pro
 * InovAMF", e os botões de avançar/retroceder etapa (RF-09, staff-only). */
export function TeamHeader({
  team,
  isStaff,
  isChangingStage,
  onAdvance,
}: {
  team: TeamDetail;
  isStaff: boolean;
  isChangingStage: boolean;
  onAdvance: (direction: 1 | -1) => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{team.ideaName}</h1>
          {team.isReadyForInovamf && (
            <Badge className="bg-brand-600 text-white">Pronta p/ InovAMF</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Turma {team.cohort} · Etapa atual: {team.currentStage.name}
        </p>
      </div>
      {isStaff && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isChangingStage || team.currentStage.number <= 1}
            onClick={() => onAdvance(-1)}
          >
            Retroceder etapa
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isChangingStage || team.currentStage.number >= 6}
            onClick={() => onAdvance(1)}
          >
            Avançar etapa
          </Button>
        </div>
      )}
    </div>
  );
}
