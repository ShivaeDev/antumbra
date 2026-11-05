import { sessionOpening } from "@antumbra/domain-sessions/rows/session-opening.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { birth } from "#rows/birth.ts";

const AdmittedBirth = Schema.Struct({ ...birth.fields, backend: Schema.String, model: Schema.String });

export const admitted = query("admitted", {
	input: {},
	output: Schema.Array(AdmittedBirth),
	reads: [birth, sessionOpening, voyage],
});
