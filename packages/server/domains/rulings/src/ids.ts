import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const RulingId = Id.brand("RulingId");
export type RulingId = typeof RulingId.Type;
export const choiceId = (rulingId: RulingId, position: number): string => `${rulingId}/choice/${position}`;

export const askNoticeId = (rulingId: RulingId, contextId: string): string => `ruling-ask:${rulingId}:${contextId}`;
export const parkNoticeId = (rulingId: RulingId): string => `ruling-parked:${rulingId}`;
