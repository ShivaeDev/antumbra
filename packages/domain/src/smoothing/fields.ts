import { Schema } from "effect";

export const SMOOTH_TAG = "board/smooth";

export const SMOOTHER_ROLE = "smoother";

export const SmoothPayload = Schema.Struct({ voyageId: Schema.String });

export type SmoothFields = typeof SmoothPayload.Type;
