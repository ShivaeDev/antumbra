import {
	type IntentNotFound,
	type IntentStatus,
	Kernel,
	type PayloadInvalid,
	type StoredIntentInvalid,
	type UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError, WriteExecutors } from "@antumbra/persistence";
import { Context, Deferred, Effect, Layer, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import type { RecoveryFields } from "#session-recovery.ts";
import type { SpawnFields } from "#spawn-fields.ts";

// why: the three ways the kernel can turn a submission away — a payload it
// cannot decode, a tag no domain registered, or the write that records the
// submission failing. Every act that reaches the kernel refuses this way.
export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

// why: rousing reads the durable Intent rows before it decides, so a row it
// cannot read is a refusal of its own — one that submitting alone never had.
export type RouseRefused = SpawnRefused | StoredIntentInvalid;

// why: the wake is handed back rather than fired and forgotten, because a
// caller that does not watch it is exactly how a parked wake became invisible.
// `retried` says which act this was: a fresh demand, or a second push at one
// the record already held.
export interface SessionRouse {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError>;
	readonly id: string;
	readonly retried: boolean;
}

export interface KernelReachService {
	readonly queueSiesta: (sessionId: string) => Effect.Effect<void>;
	// why: the admiral's send is the only thing that wakes a Session, so a send
	// meeting a wake already parked in waiting pushes that one rather than
	// stacking a second demand behind it — the blocker it named may have cleared
	// since, and nothing else in the system will ever ask again.
	readonly rouseSession: (
		payload: RecoveryFields,
	) => Effect.Effect<SessionRouse, RouseRefused>;
	readonly submitRecovery: (
		payload: RecoveryFields,
	) => Effect.Effect<string, SpawnRefused>;
	readonly submitSpawn: (
		payload: SpawnFields,
	) => Effect.Effect<string, SpawnRefused>;
}

export class KernelReach extends Context.Service<
	KernelReach,
	KernelReachService
>()("@antumbra/domain/KernelReach") {}

export class KernelReachInstaller extends Context.Service<
	KernelReachInstaller,
	{
		readonly install: (reach: KernelReachService) => Effect.Effect<void>;
	}
>()("@antumbra/domain/KernelReachInstaller") {}

// why: the domain is built before the kernel, but callers must only know the
// scheduler acts they can request. The Layer owns one late-bound path and the
// installer completes it once; callers wait instead of observing partial boot.
export const KernelReachDeferredLive = Layer.unwrap(
	Effect.gen(function* () {
		const deferred = yield* Deferred.make<KernelReachService>();
		const withReach = <A, E>(
			use: (reach: KernelReachService) => Effect.Effect<A, E>,
		) => Deferred.await(deferred).pipe(Effect.flatMap(use));
		return Layer.merge(
			Layer.succeed(KernelReach)({
				queueSiesta: (sessionId) =>
					withReach((reach) => reach.queueSiesta(sessionId)),
				rouseSession: (payload) =>
					withReach((reach) => reach.rouseSession(payload)),
				submitRecovery: (payload) =>
					withReach((reach) => reach.submitRecovery(payload)),
				submitSpawn: (payload) =>
					withReach((reach) => reach.submitSpawn(payload)),
			}),
			Layer.succeed(KernelReachInstaller)({
				install: (reach) =>
					Deferred.succeed(deferred, reach).pipe(Effect.asVoid),
			}),
		);
	}),
);

// why: the tools a session acts through are built inside the spawn intent,
// which already runs under the kernel — but the domain that owns them was
// built before it. This layer closes the circle from above and is the only
// place the kernel and an agent's own acts meet; it stands beside the
// dispatcher, which reaches the kernel the same way.
export const KernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const installer = yield* KernelReachInstaller;
		const kernel = yield* Kernel;
		const executors = yield* Effect.context<WriteExecutors>();
		const watched = (id: string, retried: boolean): SessionRouse => ({
			changes: kernel.changes(id).pipe(Stream.provideContext(executors)),
			id,
			retried,
		});
		const submitted = (payload: RecoveryFields) =>
			kernel
				.submit(domain.recover, payload)
				.pipe(Effect.map((submission) => watched(submission.id, false)));
		// why: a parked wake that moved on between the read and the push is a wake
		// nobody has to push — but it may also have moved to a terminal status, and
		// the admiral is still owed one. Submitting is the answer to both, because
		// a recover meeting an attachment that arrived meanwhile only hands the
		// words over.
		const pushed = (id: string, payload: RecoveryFields) =>
			kernel.retry(id).pipe(
				Effect.as(watched(id, true)),
				Effect.catchTags({
					IntentNotFound: () => submitted(payload),
					InvalidTransition: () => submitted(payload),
				}),
			);
		const reach: KernelReachService = {
			queueSiesta: (sessionId) =>
				kernel.submit(domain.siesta, { sessionId }).pipe(
					Effect.asVoid,
					Effect.provideContext(executors),
					Effect.catchCause((cause) =>
						Effect.logWarning(
							"a stand down could not be queued",
							{ sessionId },
							cause,
						),
					),
				),
			rouseSession: (payload) =>
				Effect.gen(function* () {
					const active = yield* kernel.active(domain.recover);
					const parked = active.find(
						(intent) =>
							intent.payload.sessionId === payload.sessionId &&
							intent.status === "waiting",
					);
					return yield* parked === undefined
						? submitted(payload)
						: pushed(parked.id, payload);
				}).pipe(Effect.provideContext(executors)),
			submitRecovery: (payload) =>
				kernel.submit(domain.recover, payload).pipe(
					Effect.map((submission) => submission.id),
					Effect.provideContext(executors),
				),
			// why: a hail is answered rather than fired and forgotten — the caller
			// is a window or a router waiting on the intent it just asked for, so
			// the submission's id travels back and refusals stay on the channel.
			submitSpawn: (payload) =>
				kernel.submit(domain.spawn, payload).pipe(
					Effect.map((submission) => submission.id),
					Effect.provideContext(executors),
				),
		};
		yield* installer.install(reach);
	}),
);
