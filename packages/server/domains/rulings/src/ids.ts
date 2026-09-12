import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const RulingId = Id.brand("RulingId");
export type RulingId = typeof RulingId.Type;
export const choiceId = (rulingId: RulingId, position: number): string => `${rulingId}/choice/${position}`;
