import { dirname, join } from "node:path";
import { type Delivery, laneEvents, openSessionLanes } from "@antumbra/backend-claude";
import { openThreadClaims, openThreadTree, type RpcNotification, threadOpened } from "@antumbra/backend-codex";
import type { SightSource } from "@antumbra/contract";
import { AgentDomain, AgentDomainLive, BackendCapacityReleaseLive, SettingsSourceLive, SightSourceLive } from "@antumbra/domain";
import { KernelLive } from "@antumbra/kernel";
import { acquireTemporaryPersistence, type TemporaryPersistence } from "@antumbra/persistence/testing";
import type { AgentBackend, Runner, SessionHandle } from "@antumbra/plugin-api";
import { makeEffectApp } from "@antumbra/testing-runtime";
import { NodeServices } from "@effect/platform-node";
import { Deferred, Effect, Layer, Option, Stream } from "effect";
import {
	type ScriptedSweep,
	type StoredTranscripts,
	scriptedClaudeAudit,
	scriptedCodexAudit,
	storedNothing,
	sweptClean,
} from "#test/session-tree-audits.ts";

export { acquireTemporaryPersistence };

const scriptedClaude = (script: ReadonlyArray<Delivery>, stored: StoredTranscripts, drained: Effect.Effect<unknown>): AgentBackend => ({
	audit: scriptedClaudeAudit(stored),
	capabilities: {
		imageInput: false,
	},
	openSession: () =>
		Effect.sync(() => {
			const lanes = openSessionLanes();
			const events = script.flatMap((delivery) => [...laneEvents(lanes, delivery)]);
			return {
				events: Stream.fromArray(events).pipe(Stream.concat(Stream.fromEffect(drained).pipe(Stream.drain))),
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.none()),
				queue: () => Effect.void,
				steer: () => Effect.void,
			} satisfies SessionHandle;
		}),
	tag: "claude",
});

const scriptedCodex = (
	rootThread: string,
	script: ReadonlyArray<RpcNotification>,
	sweep: ScriptedSweep,
	drained: Effect.Effect<unknown>,
): AgentBackend => ({
	audit: scriptedCodexAudit(sweep),
	capabilities: {
		imageInput: true,
	},
	openSession: () =>
		Effect.sync(() => {
			const tree = openThreadTree(rootThread, openThreadClaims());
			const events = [
				threadOpened("thread/start", { thread: { id: rootThread } }, rootThread),
				...script.flatMap((notification) => tree.events(notification)),
			];
			return {
				events: Stream.fromArray(events).pipe(Stream.concat(Stream.fromEffect(drained).pipe(Stream.drain))),
				interrupt: Effect.void,
				nativeRef: Effect.succeed(Option.some(rootThread)),
				queue: () => Effect.void,
				steer: () => Effect.void,
			} satisfies SessionHandle;
		}),
	tag: "codex",
});

const runner: Runner = {
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
	).pipe(Layer.provide(NodeServices.layer), Layer.provideMerge(SettingsSourceLive), Layer.provideMerge(temporary.layer));

const sightLayer = (temporary: TemporaryPersistence, backend: AgentBackend) =>
	SightSourceLive.pipe(
		Layer.provideMerge(BackendCapacityReleaseLive),
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
	drained: Effect.Effect<unknown> = Effect.void,
	stored: StoredTranscripts = storedNothing,
) => sightLayer(temporary, scriptedClaude(script, stored, drained));

export const codexRehearsalLayer = (
	temporary: TemporaryPersistence,
	rootThread: string,
	script: ReadonlyArray<RpcNotification>,
	drained: Effect.Effect<unknown> = Effect.void,
	sweep: ScriptedSweep = sweptClean,
) => sightLayer(temporary, scriptedCodex(rootThread, script, sweep, drained));

interface SessionTreeHarness {
	readonly drained: Effect.Effect<void>;
}

const makeRehearsalIt = (backend: (drained: Effect.Effect<void>) => AgentBackend) => ({
	effectApp: makeEffectApp<SessionTreeHarness, SightSource>((temporary) =>
		Effect.gen(function* () {
			const drained = yield* Deferred.make<void>();
			return {
				harness: Effect.succeed({ drained: Deferred.await(drained) }),
				layer: sightLayer(temporary, backend(Deferred.succeed(drained, undefined))).pipe(Layer.orDie),
			};
		}),
	),
});

export const claudeRehearsalIt = (script: ReadonlyArray<Delivery>, stored: StoredTranscripts = storedNothing) =>
	makeRehearsalIt((drained) => scriptedClaude(script, stored, drained));

export const codexRehearsalIt = (rootThread: string, script: ReadonlyArray<RpcNotification>, sweep: ScriptedSweep = sweptClean) =>
	makeRehearsalIt((drained) => scriptedCodex(rootThread, script, sweep, drained));
