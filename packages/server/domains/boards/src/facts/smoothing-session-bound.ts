import { fact } from "@antumbra/platform-feature/fact.ts";
import { smoothingSession } from "#rows/smoothing-session.ts";

const { status: _status, ...binding } = smoothingSession.fields;
export const smoothingSessionBound = fact("SmoothingSessionBound", binding);
