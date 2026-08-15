import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IDEA_MATURITY_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { TeamDetail } from "@/types";

/** Dados cadastrais da equipe (RF-08). */
export function TeamInfoCard({ team }: { team: TeamDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados cadastrais</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div>
          <span className="font-medium">Descrição: </span>
          <span className="text-muted-foreground">{team.ideaDescription}</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium">Área: </span>
            <span className="text-muted-foreground">{team.area?.name ?? "—"}</span>
          </div>
          <div>
            <span className="font-medium">Estágio da ideia: </span>
            <span className="text-muted-foreground">{IDEA_MATURITY_LABELS[team.ideaMaturity]}</span>
          </div>
          <div>
            <span className="font-medium">Origem: </span>
            <span className="text-muted-foreground">{team.sourceOrigin ?? "—"}</span>
          </div>
        </div>
        <div>
          <span className="font-medium">Cadastrada em: </span>
          <span className="text-muted-foreground">{formatDate(team.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
