import type { IdeaArea } from "@/types";
import { daysFromNow } from "../utils";

/** Lista configurável pelo administrador (RF-04). */
export const MOCK_IDEA_AREAS: IdeaArea[] = [
  { id: 1, name: "Educação", createdAt: daysFromNow(-200) },
  { id: 2, name: "Saúde", createdAt: daysFromNow(-200) },
  { id: 3, name: "Tecnologia", createdAt: daysFromNow(-200) },
  { id: 4, name: "Sustentabilidade", createdAt: daysFromNow(-200) },
  { id: 5, name: "Finanças", createdAt: daysFromNow(-200) },
];
