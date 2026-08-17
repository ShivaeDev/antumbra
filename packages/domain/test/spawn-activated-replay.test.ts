import { type Gate, type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, Writer } from "@antumbra/persistence";
import type { AgentBackend, MooragePlan } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref, Schedule, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	makeScriptedRunner,
} from "#test/harness.ts";
import { reportsNativeRef } from "#test/session-recovery-fixture.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);
const CLOSED: Gate = { admits: () => false, id: "test/closed" };
const payload: SpawnFields = {
	agentId: "agent-activated",
	backend: "scripted",
	charter: "survive activation",
	pieceId: "piece-activated",
	role: "test hand",
	runner: "local",
	sessionId: "session-activated",
	voyageId: "voyage-activated",
};

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const seedActivatedBoundary = (intentId: string, plan: MooragePlan) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const berth = Option.getOrThrow(Option.fromUndefinedOr(plan.berths[0]));
		yield* writer.write(
			Effect.gen(function* () {
				yield* db.Agent.create({
					charter: payload.charter,
					id: payload.agentId,
					role: payload.role,
					status: "alive",
				});
				yield* db.PieceAgent.create({
					agentId: payload.agentId,
					pieceId: Option.getOrThrow(Option.fromUndefinedOr(payload.pieceId)),
				});
				yield* db.VoyageAgent.create({
					agentId: payload.agentId,
					role: payload.role,
					voyageId: Option.getOrThrow(Option.fromUndefinedOr(payload.voyageId)),
				});
				yield* db.Moorage.create({
					agentId: payload.agentId,
					reclaimState: null,
					root: plan.root,
					runner: payload.runner,
					status: "ready",
				});
				yield* db.Berth.create({
					agentId: payload.agentId,
					branch: berth.branch,
					id: `${payload.agentId}:${berth.slug}`,
					path: berth.path,
					reclaimState: null,
					ref: berth.ref,
					runner: payload.runner,
					slug: berth.slug,
					source: berth.source,
					status: "ready",
					strandedAt: null,
				});
				yield* db.AgentSession.create({
					agentId: payload.agentId,
					backend: payload.backend,
					charterDeliveredAt: new Date(1),
					cwd: plan.root,
					id: payload.sessionId,
					nativeRef: "native-existing",
					executionStatus: "active",
					status: "open",
				});
				yield* db.SessionEvent.create({
					at: new Date(2),
					kind: "message",
					payload: '{"role":"agent","text":"durable","type":"message"}',
					seq: 0,
					sessionId: payload.sessionId,
				});
				yield* db.Intent.where({ id: intentId }).update({ status: "running" });
			}),
		);
	});

const birthRows = Effect.gen(function* () {
	const db = yield* Database;
	return {
		agent: yield* db.Agent.where({ id: payload.agentId }).first(),
		berths: yield* db.Berth.where({ agentId: payload.agentId }).all(),
		moorage: yield* db.Moorage.where({ agentId: payload.agentId }).first(),
		pieces: yield* db.PieceAgent.where({ agentId: payload.agentId }).all(),
		session: yield* db.AgentSession.where({ id: payload.sessionId }).first(),
		transcript: yield* db.SessionEvent.where({
			sessionId: payload.sessionId,
		}).all(),
		voyages: yield* db.VoyageAgent.where({ agentId: payload.agentId }).all(),
	};
});

const countOpens = (
	backend: AgentBackend,
	opens: Ref.Ref<number>,
): AgentBackend => ({
	...backend,
	openSession: (options) =>
		Ref.update(opens, (count) => count + 1).pipe(
			Effect.andThen(backend.openSession(options)),
		),
});

it.live(
	"boot completes an activated birth while resuming its durable Session",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const opens = yield* Ref.make(0);
			const backend = countOpens(
				reportsNativeRef(scripted.backend, scripted, "native-existing"),
				opens,
			);
			const plan = recorded.runner.plan({
				agentId: payload.agentId,
				repos: [{ ref: "main", source: "/somewhere/activated" }],
			});
			const seeded = yield* Effect.gen(function* () {
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/activated",
				});
				const submission = yield* kernel.submit(domain.spawn, payload);
				yield* seedActivatedBoundary(submission.id, plan);
				return { before: yield* birthRows, intentId: submission.id };
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						backend,
						{ gates: [CLOSED] },
						recorded.runner,
					),
				),
			);
			yield* Effect.gen(function* () {
				const kernel = yield* Kernel;
				expect(yield* untilTerminal(kernel.changes(seeded.intentId))).toBe(
					"succeeded",
				);
				const after = yield* birthRows;
				expect({ ...after, transcript: seeded.before.transcript }).toEqual(
					seeded.before,
				);
				yield* eventually(
					Effect.gen(function* () {
						expect({
							opened: yield* Ref.get(opens),
							provisioned: yield* recorded.provisioned,
						}).toEqual({ opened: 1, provisioned: [] });
						const resumed = yield* scripted.session(payload.sessionId);
						expect(resumed).toBeDefined();
						expect(resumed === undefined ? [] : yield* resumed.sent).toEqual([
							"Reconcile durable Antumbra truth and continue your assigned work.",
						]);
						const settled = yield* birthRows;
						expect(settled.transcript.map((event) => event.seq)).toEqual([
							0, 1,
						]);
					}),
				);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, backend, {}, recorded.runner),
				),
			);
		}),
);

it.live(
	"spawn replay never treats an unknown Agent status as a new birth",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			const recorded = yield* makeScriptedRunner;
			const plan = recorded.runner.plan({
				agentId: payload.agentId,
				repos: [{ ref: "main", source: "/somewhere/activated" }],
			});
			const intentId = yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				const domain = yield* AgentDomain;
				const writer = yield* Writer;
				yield* domain.repos.register({
					defaultRef: "main",
					source: "/somewhere/activated",
				});
				const submission = yield* kernel.submit(domain.spawn, payload);
				yield* seedActivatedBoundary(submission.id, plan);
				yield* writer.write(
					db.Agent.where({ id: payload.agentId }).update({
						status: "future-agent",
					}),
				);
				return submission.id;
			}).pipe(
				Effect.provide(
					domainKernelLayer(
						temporary,
						scripted.backend,
						{ gates: [CLOSED] },
						recorded.runner,
					),
				),
			);

			yield* Effect.gen(function* () {
				const db = yield* Database;
				const kernel = yield* Kernel;
				expect(yield* untilTerminal(kernel.changes(intentId))).toBe("failed");
				const agent = Option.getOrThrow(
					yield* db.Agent.where({ id: payload.agentId }).first(),
				);
				expect(agent.status).toBe("future-agent");
				expect(yield* recorded.provisioned).toEqual([]);
				expect(yield* scripted.opened).toEqual([]);
			}).pipe(
				Effect.provide(
					domainKernelLayer(temporary, scripted.backend, {}, recorded.runner),
				),
			);
		}),
);
