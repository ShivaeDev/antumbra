import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { defineIntent } from "@antumbra/kernel";
import { type AgentBackend, type Runner, UnknownRunnerError } from "@antumbra/plugin-api";
import type { SinkFor } from "@antumbra/sessions";
import { RoleSettings } from "@antumbra/settings";
import { Effect } from "effect";
import { UnknownBackendTag } from "#errors.ts";
import { makeSmootherAgent } from "#smoothing/agent.ts";
import { SMOOTH_TAG, SMOOTHER_ROLE, type SmoothFields, SmoothPayload } from "#smoothing/fields.ts";
import { makeSmoothingPass } from "#smoothing/pass.ts";
import { smootherRoot } from "#smoothing/root.ts";

const RUNNER_TAG = "local";

interface SmoothRuntime {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: SinkFor;
}

export const smoothKind = (runtime: SmoothRuntime) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const feeds = yield* DomainFeeds;
		const roles = yield* RoleSettings;
		const smootherOf = yield* makeSmootherAgent;
		const runPass = yield* makeSmoothingPass(runtime.sinkFor);
		const smoothBoard = ({ voyageId }: SmoothFields) =>
			Effect.gen(function* () {
				const scope = BoardScope.Voyage({ voyageId });
				const days = yield* boards.uncovered(scope);
				if (days.length === 0) {
					return;
				}
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
				const cwd = yield* smootherRoot(runner, agentId);
				yield* Effect.forEach(days, (day) => runPass({ agentId, backend, cwd, day, scope, settings, voyageId }), {
					concurrency: 1,
					discard: true,
				});
			}).pipe(Effect.onExit(() => feeds.publishVoyageRefresh()));

		return defineIntent({
			execute: smoothBoard,
			payload: SmoothPayload,
			reclaim: "requeue",
			tag: SMOOTH_TAG,
		});
	});
