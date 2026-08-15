import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamMemberRole } from "@/types";
import type { TeamBoardItem } from "@/types";

/** Card de uma equipe numa coluna do kanban (RF-06). */
export function TeamBoardCard({ team }: { team: TeamBoardItem }) {
  return (
    <Link
      href={`/admin/equipes/${team.id}`}
      className="block rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-tight">{team.ideaName}</span>
        {team.isReadyForInovamf && (
          <Badge className="shrink-0 bg-brand-600 text-white">Pronta p/ InovAMF</Badge>
        )}
      </div>
      {team.area && (
        <Badge variant="secondary" className="mb-2">
          {team.area.name}
        </Badge>
      )}
      <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {team.members.map((member) => (
          <li key={member.id}>
            {member.user.name}
            {member.memberRole === TeamMemberRole.LEADER && (
              <span className="ml-1 text-[10px] uppercase text-brand-700">líder</span>
            )}
          </li>
        ))}
      </ul>
    </Link>
  );
}
