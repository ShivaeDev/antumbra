import { bind, standDownSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { Deferred, Effect, Option, PubSub } from "effect";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { SessionIdentityMissing } from "#errors.ts";
import {
	decodeSessionExecutionStatus,
	sessionExecutionTransition,
} from "#session-execution-status.ts";
import { answered } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";

const standDown = (deps: AgentDeps, identity: SessionIdentity) =>
	answered(
		identity,
		standDownSpec.name,
		Effect.gen(function* () {
			const provide = provideExecutors(deps);
			const session = yield* provide(
				deps.db.AgentSession.where({ id: identity.sessionId }).first(),
			);
			if (
				Option.isNone(session) ||
				session.value.agentId !== identity.agentId ||
				session.value.status !== "open"
			) {
				return yield* new SessionIdentityMissing({
					sessionId: identity.sessionId,
				});
			}
			const executionStatus = yield* Effect.fromResult(
				decodeSessionExecutionStatus(
					identity.sessionId,
					session.value.executionStatus,
				),
			);
			if (executionStatus === "active") {
				const next = yield* Effect.fromResult(
					sessionExecutionTransition(
						identity.sessionId,
						executionStatus,
						"request-siesta",
					),
				);
				yield* provide(
					deps.writer.write(
						deps.db.AgentSession.where({ id: identity.sessionId }).update({
							executionStatus: next,
						}),
					),
				);
				yield* PubSub.publish(deps.feeds.fleet, undefined);
				yield* PubSub.publish(deps.feeds.voyages, undefined);
			}
			const reach = yield* Deferred.await(deps.kernelReach);
			yield* Effect.forkDetach(reach.queueSiesta(identity.sessionId));
		}),
		() => "standing down",
	);

export const standDownTool = (
	deps: AgentDeps,
	identity: SessionIdentity,
): DirectTool => bind(standDownSpec, () => standDown(deps, identity));
