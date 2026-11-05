import type * as Source from "@antumbra/domain-inputs/queries/support.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { AgentBackendTagSchema } from "@antumbra/platform-vocabulary/agent-backend.ts";
import { selection as backendCatalogSelection } from "@antumbra/server-storage/records/backend-catalog.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option, Schema } from "effect";

export const support = Effect.fn("inputs.support")(function* (
	input: Schema.Struct.Type<typeof Source.support.input>,
): Effect.fn.Return<typeof Source.support.output.Type, never, Records> {
	const rows = yield* Records;

	const root = yield* rows.session
		.findOne({ where: { id: SessionId.make(input.sessionId) }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(root) || !Schema.is(AgentBackendTagSchema)(root.value.backend)) return { imageInput: false };
	const known = yield* rows.backendCatalog
		.findOne({ where: { backend: root.value.backend }, orderBy: { field: "storage_order", direction: "asc" }, select: backendCatalogSelection })
		.pipe(Effect.orDie);
	return { imageInput: Option.isSome(known) && known.value.imageInput === true };
});
