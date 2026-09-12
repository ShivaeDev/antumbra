import { fact } from "@antumbra/platform-feature/fact.ts";
import { smoothingAttempt } from "#rows/smoothing-attempt.ts";

const { voyageId, pieceId, throughToday, requestedAt, id } = smoothingAttempt.fields;
export const smoothingRequested = fact("BoardSmoothingRequested", { id, voyageId, pieceId, throughToday, requestedAt });
