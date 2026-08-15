import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEAM_MEMBER_ROLE_LABELS } from "@/lib/labels";
import type { TeamDetail } from "@/types";

/** Integrantes e mentores da equipe (RF-08). */
export function TeamMembersCard({ team }: { team: TeamDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equipe</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div>
          <p className="mb-1 font-medium">Integrantes</p>
          <ul className="flex flex-col gap-0.5 text-muted-foreground">
            {team.members.map((member) => (
              <li key={member.id}>
                {member.user.name} — {member.user.email}
                <span className="ml-1 text-xs uppercase text-brand-700">
                  {TEAM_MEMBER_ROLE_LABELS[member.memberRole]}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">Mentores</p>
          {team.mentors.length === 0 ? (
            <p className="text-muted-foreground">Nenhum mentor atribuído ainda.</p>
          ) : (
            <ul className="flex flex-col gap-0.5 text-muted-foreground">
              {team.mentors.map((tm) => (
                <li key={tm.id}>{tm.mentor.name}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
