import type { ProvisionedMoorage } from "@antumbra/plugin-api";
import { Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { SpawnFields } from "#spawn.ts";

// why: the session row and its berths are written together — a session that
// exists without the moorage it was opened in would tell a reader the agent
// is berthed nowhere.
const berthRows = (
	deps: AgentDeps,
	payload: SpawnFields,
	moorage: ProvisionedMoorage,
) =>
	Effect.forEach(moorage.berths, (berth) =>
		deps.db.Berth.create({
			agentId: payload.agentId,
			branch: berth.branch,
			id: `${payload.agentId}:${berth.slug}`,
			path: berth.path,
			ref: berth.ref,
			runner: payload.runner,
			slug: berth.slug,
			source: berth.source,
			status: "ready",
			strandedAt: null,
		}),
	);

export const recordMoorage = (
	deps: AgentDeps,
	payload: SpawnFields,
	moorage: ProvisionedMoorage,
) => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const session = yield* provide(
			deps.db.AgentSession.where({ id: payload.sessionId }).first(),
		);
		if (Option.isNone(session)) {
			yield* provide(
				deps.writer.write(
					deps.db.AgentSession.create({
						agentId: payload.agentId,
						backend: payload.backend,
						charterDeliveredAt: null,
						cwd: moorage.root,
						id: payload.sessionId,
						nativeRef: null,
						status: "open",
					}).pipe(Effect.andThen(berthRows(deps, payload, moorage))),
				),
			);
			yield* PubSub.publish(deps.feeds.fleet, undefined);
		}
	});
};
