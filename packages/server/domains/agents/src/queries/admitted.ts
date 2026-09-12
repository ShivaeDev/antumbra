import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { birth } from "#rows/birth.ts";

const AdmittedBirth = Schema.Struct({ ...birth.fields, backend: Schema.String });

export const admitted = query("admitted", {
	input: {},
	output: Schema.Array(AdmittedBirth),
	reads: [birth],
	run: Effect.fn("Agents.admitted")(function* (_input, rows) {
		const found = yield* rows.birth.where({ status: "admitted" });
		const ready: Array<typeof AdmittedBirth.Type> = [];
		for (const held of found.toSorted((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))) {
			if (held.backend !== null) ready.push({ ...held, backend: held.backend });
		}
		return ready;
	}),
});
