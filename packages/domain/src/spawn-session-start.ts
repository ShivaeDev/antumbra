import type {
	AgentBackend,
	DirectTool,
	MooragePlan,
} from "@antumbra/plugin-api";
import {
	type EventSink,
	type SessionAttachment,
	SessionFabric,
} from "@antumbra/session-fabric";
import { type Cause, Effect, Option } from "effect";
import { makeMarkMoorageReady } from "#moorage-ready.ts";
import { makeEnsureSessionRow } from "#moorage-session.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnSessionStart = Effect.gen(function* () {
	const fabric = yield* SessionFabric;
	const markMoorageReady = yield* makeMarkMoorageReady;
	const ensureSessionRow = yield* makeEnsureSessionRow;
	return <ESink, RSink, EAdmit, RAdmit, RFailure>(
		payload: SpawnFields,
		backend: AgentBackend,
		plan: MooragePlan,
		tools: ReadonlyArray<DirectTool>,
		sink: Effect.Effect<EventSink, ESink, RSink>,
		admit: (
			attachment: SessionAttachment,
		) => Effect.Effect<void, EAdmit, RAdmit>,
		onFailure: (
			cause: Cause.Cause<unknown>,
		) => Effect.Effect<void, never, RFailure>,
	) =>
		fabric
			.withStartAdmission((permit) =>
				Effect.gen(function* () {
					yield* markMoorageReady(payload);
					yield* ensureSessionRow(payload, plan);
					const eventSink = yield* sink;
					yield* fabric.start(
						permit,
						payload.agentId,
						backend,
						{
							cwd: plan.root,
							resume: Option.none(),
							sessionId: payload.sessionId,
							tools,
						},
						eventSink,
						admit,
					);
				}),
			)
			.pipe(Effect.onError(onFailure));
});
