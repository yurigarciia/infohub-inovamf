// "View" agregada para o dashboard (RF-22) — não espelha uma tabela,
// é resultado de contagens sobre teams/tasks.

export interface DashboardStageCount {
  stageId: number;
  stageName: string;
  count: number;
}

export interface DashboardStats {
  totalActiveTeams: number;
  byStage: DashboardStageCount[];
  lateTasksCount: number;
  readyForInovamfCount: number;
}
