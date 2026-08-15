import type { SessionHandle } from "@antumbra/plugin-api";
import { Clock, Effect, Option } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { SpawnFields } from "#spawn.ts";

const stampCharter = (deps: AgentDeps, payload: SpawnFields) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		yield* provideExecutors(deps)(
			deps.writer.write(
				deps.db.AgentSession.where({ id: payload.sessionId }).update({
					charterDeliveredAt: new Date(now),
				}),
			),
		);
	});

export const deliverCharterOnce = (
	deps: AgentDeps,
	payload: SpawnFields,
	handle: SessionHandle,
) =>
	Effect.gen(function* () {
		const session = yield* provideExecutors(deps)(
			deps.db.AgentSession.where({ id: payload.sessionId }).first(),
		);
		const delivered =
			Option.isSome(session) && session.value.charterDeliveredAt !== null;
		if (!delivered) {
			yield* handle.queue(payload.charter);
			yield* stampCharter(deps, payload);
		}
	});
