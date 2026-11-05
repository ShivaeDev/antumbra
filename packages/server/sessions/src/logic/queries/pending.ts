import type * as Source from "@antumbra/domain-sessions/queries/pending.ts";
import { ungated } from "@antumbra/domain-settings/queries/flags.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const pending = Effect.fn("sessions.pending")(function* (
	_input: Schema.Struct.Type<typeof Source.pending.input>,
): Effect.fn.Return<typeof Source.pending.output.Type, never, Records> {
	const rows = yield* Records;

	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	const requested = yield* rows.sessionOperation
		.findMany({ where: { status: "requested" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	return requested.filter((operation) => ungated(flags, operation.gatedBy));
});
