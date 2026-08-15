"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamBoardCard } from "@/components/teams/team-board-card";
import { useSession } from "@/lib/session";
import { getTeamsForStudent } from "@/services";
import { UserRole } from "@/types";
import type { TeamBoardItem } from "@/types";

/** Lista das equipes que o aluno integra — um aluno pode participar de
 * mais de uma (Q4). Com só uma equipe, pula direto pro detalhe dela. */
export default function AlunoEquipesPage() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const [teams, setTeams] = useState<TeamBoardItem[] | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => getTeamsForStudent(user.id).then(setTeams));
  }, [user]);

  useEffect(() => {
    if (teams && teams.length === 1) {
      router.replace(`/equipes/${teams[0].id}`);
    }
  }, [teams, router]);

  if (sessionLoading) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!user) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Faça login para ver suas equipes.</p>;
  }

  if (user.role !== UserRole.STUDENT) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Esta área é exclusiva para alunos.</p>;
  }

  if (!teams || (teams.length === 1)) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">Carregando…</p>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-xl font-semibold">Minhas equipes</h1>
        <p className="text-sm text-muted-foreground">
          {teams.length === 0 ? "Você ainda não faz parte de nenhuma equipe." : `${teams.length} equipe(s)`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => (
          <TeamBoardCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
