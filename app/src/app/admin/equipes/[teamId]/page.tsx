import { TeamDetailView } from "@/components/teams/team-detail-view";

interface PageProps {
  params: Promise<{ teamId: string }>;
}

/** Página de detalhe da equipe (RF-08, RF-09, RF-10). */
export default async function TeamDetailPage({ params }: PageProps) {
  const { teamId } = await params;
  return <TeamDetailView teamId={teamId} />;
}
