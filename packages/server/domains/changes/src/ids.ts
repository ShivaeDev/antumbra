import { Schema } from "effect";
export const ChangeId = Schema.String.pipe(Schema.brand("ChangeId"));
export type ChangeId = typeof ChangeId.Type;
export const pieceChangeId = (pieceId: string, changeId: string): string => `${pieceId}:${changeId}`;
