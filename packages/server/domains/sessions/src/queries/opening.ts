import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOpening } from "#rows/session-opening.ts";

export const opening = query("opening", {
	input: { id: SessionId },
	output: Schema.NullOr(sessionOpening.Row),
	reads: [sessionOpening],
});
