import { dirname, join } from "node:path";
import { openSessionMapping } from "@antumbra/backend-claude";
import {
	AgentDomain,
	AgentDomainLive,
	SightSourceLive,
} from "@antumbra/domain";
import { KernelLive } from "@antumbra/kernel";
import {
	type TemporaryPersistence,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import type { AgentBackend, Runner, SessionHandle } from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, Option, Schedule, Stream } from "effect";
import { rehearsalFrames } from "#test/session-tree-frames.ts";

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

// why: the real claude mapping over a scripted frame script — the backend the
// app registers, minus the process. What the domain receives is exactly what a
// live session would produce, so the record this builds is the record it builds
// in production, at zero model tokens.
const scriptedClaude: AgentBackend = {
	capabilities: { fork: false, liveInterrupt: true, multiClient: false },
	openSession: () =>
		Effect.sync(() => {
			const mapping = openSessionMapping();
			const events = rehearsalFrames.flatMap((frame) => [...mapping(frame)]);
			return {
				events: Stream.fromArray(events),
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.none()),
				queue: () => Effect.void,
				steer: () => Effect.void,
			} satisfies SessionHandle;
		}),
	tag: "claude",
};

const runner: Runner = {
	capabilities: { liveTerminal: false },
	captureChange: (berth) =>
		Effect.succeed({
			branch: berth.branch,
			headSha: `sha-${berth.branch}`,
			workingDiff: "",
			workingTreeStatus: "",
			worktreePath: berth.path,
		}),
	plan: (request) => ({ berths: [], root: `/tmp/moorage/${request.agentId}` }),
	provision: () => Effect.void,
	reclaim: () => Effect.succeed({ _tag: "reclaimed" as const }),
	scrap: () => Effect.void,
	tag: "local",
};

const domainLayer = (temporary: TemporaryPersistence) =>
	AgentDomainLive(
		new Map([[scriptedClaude.tag, scriptedClaude]]),
		new Map([[runner.tag, runner]]),
		new Map(),
		join(dirname(temporary.database), "artifacts"),
	).pipe(
		Layer.provide(NodeServices.layer),
		Layer.provideMerge(temporary.layer),
	);

export const rehearsalLayer = (temporary: TemporaryPersistence) =>
	SightSourceLive.pipe(
		Layer.provideMerge(
			Layer.unwrap(
				Effect.gen(function* () {
					const domain = yield* AgentDomain;
					return KernelLive({ kinds: domain.kinds });
				}),
			),
		),
		Layer.provideMerge(domainLayer(temporary)),
	);
