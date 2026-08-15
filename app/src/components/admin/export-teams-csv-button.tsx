import { Button } from "@/components/ui/button";
import { downloadTextFile, toCsv } from "@/lib/csv";
import { IDEA_MATURITY_LABELS } from "@/lib/labels";
import { TeamMemberRole } from "@/types";
import type { TeamBoardItem } from "@/types";

const HEADERS = [
  "Nome da ideia",
  "Área",
  "Etapa atual",
  "Turma",
  "Estágio da ideia",
  "Pronta para o InovAMF",
  "Líder",
  "E-mail do líder",
  "Integrantes",
];

function toRow(team: TeamBoardItem) {
  const leader = team.members.find((m) => m.memberRole === TeamMemberRole.LEADER);
  const others = team.members
    .filter((m) => m.memberRole !== TeamMemberRole.LEADER)
    .map((m) => m.user.name)
    .join("; ");
  return {
    "Nome da ideia": team.ideaName,
    Área: team.area?.name ?? "",
    "Etapa atual": team.currentStage.name,
    Turma: team.cohort,
    "Estágio da ideia": IDEA_MATURITY_LABELS[team.ideaMaturity],
    "Pronta para o InovAMF": team.isReadyForInovamf ? "Sim" : "Não",
    Líder: leader?.user.name ?? "",
    "E-mail do líder": leader?.user.email ?? "",
    Integrantes: others,
  };
}

/** Exporta as equipes já filtradas em tela para CSV (RF-23). */
export function ExportTeamsCsvButton({ teams }: { teams: TeamBoardItem[] }) {
  function handleExport() {
    const csv = toCsv(teams.map(toRow), HEADERS);
    const today = new Date().toISOString().slice(0, 10);
    downloadTextFile(`infohub-equipes-${today}.csv`, csv);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={teams.length === 0}
      onClick={handleExport}
    >
      Exportar CSV
    </Button>
  );
}
