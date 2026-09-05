import { Database } from "@antumbra/persistence";
import type { AgentBackend, DirectTool, MooragePlan } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { type EventSink, type SessionAttachment, SessionFabric } from "@antumbra/session-fabric";
import { SessionRegistration } from "@antumbra/sessions/registration/service";
import { type Cause, Effect, Option } from "effect";
import { makeMarkMoorageReady } from "#moorage-ready.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const makeSpawnSessionStart = Effect.gen(function* () {
	const fabric = yield* SessionFabric;
	const markMoorageReady = yield* makeMarkMoorageReady;
	const registration = yield* SessionRegistration;
	const db = yield* Database;
	return <ESink, RSink, EAdmit, RAdmit, RFailure>(
		payload: SpawnFields,
		backend: AgentBackend,
		plan: MooragePlan,
		tools: ReadonlyArray<DirectTool>,
		sink: Effect.Effect<EventSink, ESink, RSink>,
		admit: (attachment: SessionAttachment) => Effect.Effect<void, EAdmit, RAdmit>,
		onFailure: (cause: Cause.Cause<unknown>) => Effect.Effect<void, never, RFailure>,
	) =>
		fabric
			.withStartAdmission((permit) =>
				Effect.gen(function* () {
					yield* markMoorageReady(payload);
					yield* ensureAgentCanOwnLocalWork(payload.agentId).pipe(Effect.provideService(Database, db));
					yield* registration.ensureRoot(payload, plan.root);
					const eventSink = yield* sink;
					yield* fabric.start(
						permit,
						payload.agentId,
						backend,
						{
							cwd: plan.root,
							effort: Option.fromUndefinedOr(payload.effort),
							model: Option.fromUndefinedOr(payload.model),
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
