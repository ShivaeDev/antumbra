import { type AgentBackend, type Runner, UnknownRunnerError } from "@antumbra/plugin-api";
import type { SinkFor } from "@antumbra/sessions";
import type { ResolvedAgentSettings } from "@antumbra/settings";
import { RoleSettings } from "@antumbra/settings";
import { Effect } from "effect";
import { UnknownBackendTag } from "#errors.ts";
import { makeSmootherAgent } from "#smoothing/agent.ts";
import { SMOOTHER_ROLE } from "#smoothing/fields.ts";
import { smootherRoot } from "#smoothing/root.ts";

const RUNNER_TAG = "local";

export interface SmoothRuntime {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: SinkFor;
}

export interface SmootherAtHand {
	readonly agentId: string;
	readonly backend: AgentBackend;
	readonly cwd: string;
	readonly settings: ResolvedAgentSettings;
	readonly voyageId: string;
}

export const makeSmootherAtHand = (runtime: SmoothRuntime) =>
	Effect.gen(function* () {
		const roles = yield* RoleSettings;
		const smootherOf = yield* makeSmootherAgent;
		return Effect.fnUntraced(function* (voyageId: string) {
			const settings = yield* roles.resolve(voyageId, SMOOTHER_ROLE);
			const backend = runtime.backends.get(settings.backend);
			if (backend === undefined) {
				return yield* new UnknownBackendTag({ tag: settings.backend });
			}
			const runner = runtime.runners.get(RUNNER_TAG);
			if (runner === undefined) {
				return yield* new UnknownRunnerError({ tag: RUNNER_TAG });
			}
			const agentId = yield* smootherOf(voyageId);
			return { agentId, backend, cwd: yield* smootherRoot(runner, agentId), settings, voyageId } satisfies SmootherAtHand;
		});
	});
