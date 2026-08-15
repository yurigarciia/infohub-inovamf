import { TeamDetailView } from "@/components/teams/team-detail-view";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

/** Página de detalhe da equipe (RF-08, RF-09, RF-10). Rota neutra —
 * usada tanto pelo admin/mentor (via `/admin`) quanto pelo aluno membro
 * da equipe (via `/aluno/equipes`); o conteúdo/permissões já se
 * adaptam por papel dentro de `TeamDetailView`. */
export default async function TeamDetailPage({ params }: PageProps) {
  const { teamId } = await params;
  return <TeamDetailView teamId={teamId} />;
}
