import { BadRequestError } from "../../shared/errors.js";

/** As 6 etapas fixas do funil InfoHub → InovAMF. */
export const MIN_STAGE = 1;
export const MAX_STAGE = 6;

/**
 * RN-01 — ponto único de validação de transição de etapa (RF-09).
 *
 * Nesta fase a checagem é estrutural: destino dentro de 1..6, diferente
 * da atual e no máximo um passo de distância (avança ou retrocede uma
 * etapa por vez). A regra completa — só avançar quando as tarefas
 * obrigatórias da etapa atual estiverem aprovadas — entra junto com o
 * módulo de tarefas (B4); o mentor/admin sempre pode mover manualmente.
 */
export function assertTransitionAllowed(fromStage: number, toStage: number): void {
  if (toStage < MIN_STAGE || toStage > MAX_STAGE) {
    throw new BadRequestError(`Etapa ${toStage} não existe (o funil vai de 1 a 6).`);
  }
  if (toStage === fromStage) {
    throw new BadRequestError("A equipe já está nesta etapa.");
  }
  if (Math.abs(toStage - fromStage) !== 1) {
    throw new BadRequestError("Só é possível avançar ou retroceder uma etapa por vez.");
  }
}
