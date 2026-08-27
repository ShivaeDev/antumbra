import { dirname, join } from "node:path";
import {
	type Delivery,
	laneEvents,
	openSessionLanes,
} from "@antumbra/backend-claude";
import {
	openThreadClaims,
	openThreadTree,
	type RpcNotification,
	threadOpened,
} from "@antumbra/backend-codex";
import {
	AgentDomain,
	AgentDomainLive,
	SettingsSourceLive,
	SightSourceLive,
} from "@antumbra/domain";
import { KernelLive } from "@antumbra/kernel";
import {
	acquireTemporaryPersistence,
	type TemporaryPersistence,
} from "@antumbra/persistence/testing";
import type { AgentBackend, Runner, SessionHandle } from "@antumbra/plugin-api";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer, Option, Schedule, Stream } from "effect";
import {
	type ScriptedSweep,
	type StoredTranscripts,
	scriptedClaudeAudit,
	scriptedCodexAudit,
	storedNothing,
	sweptClean,
} from "#test/session-tree-audits.ts";

export { acquireTemporaryPersistence };

export const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

// why: the real claude lanes over a scripted delivery script — the backend the
// app registers, minus the process. What the domain receives is exactly what a
// live session would produce on either lane, so the record this builds is the
// record it builds in production, at zero model tokens.
const scriptedClaude = (
	script: ReadonlyArray<Delivery>,
	stored: StoredTranscripts,
): AgentBackend => ({
	audit: scriptedClaudeAudit(stored),
	capabilities: {
		fork: false,
		imageInput: false,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: () =>
		Effect.sync(() => {
			const lanes = openSessionLanes();
			const events = script.flatMap((delivery) => [
				...laneEvents(lanes, delivery),
			]);
			return {
				events: Stream.fromArray(events),
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.none()),
				queue: () => Effect.void,
				steer: () => Effect.void,
			} satisfies SessionHandle;
		}),
	tag: "claude",
});

// why: the real codex tree over a scripted broadcast — the notifications the
// app-server sends for a session and for every thread it delegated to, minus
// the process. The un-filtering, the attribution and the admissions are the
// live ones, so the record this builds is the record it builds in production.
const scriptedCodex = (
	rootThread: string,
	script: ReadonlyArray<RpcNotification>,
	sweep: ScriptedSweep,
): AgentBackend => ({
	audit: scriptedCodexAudit(sweep),
	capabilities: {
		fork: true,
		imageInput: true,
		liveInterrupt: true,
		multiClient: false,
	},
	openSession: () =>
		Effect.sync(() => {
			const tree = openThreadTree(rootThread, openThreadClaims());
			const events = [
				threadOpened(
					"thread/start",
					{ thread: { id: rootThread } },
					rootThread,
				),
				...script.flatMap((notification) => tree.events(notification)),
			];
			return {
				events: Stream.fromArray(events),
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.some(rootThread)),
				queue: () => Effect.void,
				steer: () => Effect.void,
			} satisfies SessionHandle;
		}),
	tag: "codex",
});

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

const domainLayer = (temporary: TemporaryPersistence, backend: AgentBackend) =>
	AgentDomainLive(
		new Map([[backend.tag, backend]]),
		new Map([[runner.tag, runner]]),
		new Map(),
		join(dirname(temporary.database), "artifacts"),
		join(dirname(temporary.database), "session-inputs"),
	).pipe(
		Layer.provide(NodeServices.layer),
		Layer.provideMerge(SettingsSourceLive),
		Layer.provideMerge(temporary.layer),
	);

const sightLayer = (temporary: TemporaryPersistence, backend: AgentBackend) =>
	SightSourceLive.pipe(
		Layer.provideMerge(
			Layer.unwrap(
				Effect.gen(function* () {
					const domain = yield* AgentDomain;
					return KernelLive({ kinds: domain.kinds });
				}),
			),
		),
		Layer.provideMerge(domainLayer(temporary, backend)),
	);

export const rehearsalLayer = (
	temporary: TemporaryPersistence,
	script: ReadonlyArray<Delivery>,
	stored: StoredTranscripts = storedNothing,
) => sightLayer(temporary, scriptedClaude(script, stored));

export const codexRehearsalLayer = (
	temporary: TemporaryPersistence,
	rootThread: string,
	script: ReadonlyArray<RpcNotification>,
	sweep: ScriptedSweep = sweptClean,
) => sightLayer(temporary, scriptedCodex(rootThread, script, sweep));
