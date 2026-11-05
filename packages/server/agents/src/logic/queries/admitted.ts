import type * as Source from "@antumbra/domain-agents/queries/admitted.ts";
import { birth } from "@antumbra/domain-agents/rows/birth.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const AdmittedBirth = Schema.Struct({ ...birth.fields, backend: Schema.String, model: Schema.String });

export const admitted = Effect.fn("Agents.admitted")(function* (
	_input: Schema.Struct.Type<typeof Source.admitted.input>,
): Effect.fn.Return<typeof Source.admitted.output.Type, never, Records> {
	const rows = yield* Records;

	const found = yield* rows.birth
		.findMany({ where: { status: "admitted" }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	const ready: Array<typeof AdmittedBirth.Type> = [];
	for (const held of found.toSorted((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))) {
		if (held.backend !== null && held.model !== null) ready.push({ ...held, backend: held.backend, model: held.model });
	}
	return ready;
});
