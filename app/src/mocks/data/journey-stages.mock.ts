import type { JourneyStage } from "@/types";

/** Espelha o seed de db/schema.sql (as 6 etapas fixas do funil). */
export const MOCK_JOURNEY_STAGES: JourneyStage[] = [
  { id: 1, number: 1, name: "Envio da ideia" },
  { id: 2, number: 2, name: "Contato com a equipe" },
  { id: 3, number: 3, name: "Encontro 1 - Entendendo a ideia" },
  { id: 4, number: 4, name: "Encontro 2 - Proposta de valor" },
  { id: 5, number: 5, name: "Encontro 3 - Modelo de negócio" },
  { id: 6, number: 6, name: "Encontro 4 - Pitch e inscrição" },
];
