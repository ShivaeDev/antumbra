import { ArtifactsLive } from "@antumbra/artifacts";
import { DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { PiecesLive } from "@antumbra/pieces";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { ReportsLive } from "@antumbra/reports";
import { Deferred, Effect, Layer, Option } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";
import { sweepBerths } from "#berth-sweep.ts";
import { makeBoardProcedures } from "#board-procedures.ts";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeChangeProcedureCompiler } from "#change-procedures.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import type { AgentDeps, KernelReach } from "#deps.ts";
import { makeEventSinkFactory } from "#events.ts";
import { makeSessionFabric, type SessionAttachment } from "#fabric.ts";
import { makeRepoRegistry } from "#registry.ts";
import { makeRetireKind } from "#retire.ts";
import { makeRecoveryKind, RECOVERY_INSTRUCTION } from "#session-recovery.ts";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import { SessionRecoveryHeld } from "#session-recovery-error.ts";
import { SessionRecoveryRuntime } from "#session-recovery-runtime.ts";
import { makeSpawnKind } from "#spawn.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import { makeVoyageProcedures } from "#voyages.ts";

export { AGENTS_ALIVE_GAUGE, AgentDomain } from "#agent-domain-service.ts";

const admitRecoveredSession = (
	context: SessionRecoveryContext,
	attachment: SessionAttachment,
) =>
	Effect.gen(function* () {
		const openedNativeRef = yield* attachment.openedNativeRef;
		if (openedNativeRef !== context.nativeRef) {
			return yield* new SessionRecoveryHeld({
				detail: `provider resumed native session ${openedNativeRef}, expected ${context.nativeRef}`,
			});
		}
		yield* attachment.handle.queue(RECOVERY_INSTRUCTION);
	});

// why: built before the kernel starts — the boot sweep must settle stranded
// agents before admission can pull anything that reads their state.
export const AgentDomainLive = (
	backends: ReadonlyMap<string, AgentBackend>,
	runners: ReadonlyMap<string, Runner>,
	changeHosts: ReadonlyMap<string, ChangeHost>,
	artifactsDirectory: string,
) => {
	const capabilities = Layer.mergeAll(
		PiecesLive,
		ArtifactsLive(artifactsDirectory),
		ReportsLive,
	).pipe(Layer.provideMerge(DomainFeedsLive));
	return Layer.effect(AgentDomain)(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const fabric = yield* makeSessionFabric;
			const feeds = yield* DomainFeeds;
			const sinkFor = yield* makeEventSinkFactory(feeds.events);
			const kernelReach = yield* Deferred.make<KernelReach>();
			const deps: AgentDeps = {
				backends,
				changeHosts,
				db,
				executors,
				fabric,
				feeds,
				kernelReach,
				runners,
				sinkFor,
				writer,
			};
			const makeSpawn = yield* makeSpawnKind;
			const makeChanges = yield* makeChangeProcedureCompiler;
			const compileCaptainTools = yield* makeCaptainToolCompiler;
			const compileCrewTools = yield* makeCrewToolCompiler;
			const spawn = makeSpawn(deps);
			const toolsFor = (context: SessionRecoveryContext) =>
				context.role === CAPTAIN_ROLE &&
				Option.isSome(context.identity.voyageId)
					? compileCaptainTools(deps, context.identity)
					: compileCrewTools(deps, context.identity);
			const resumeSession = (context: SessionRecoveryContext) => {
				const backend = backends.get(context.backend);
				if (backend === undefined) {
					return Effect.fail(
						new SessionRecoveryHeld({
							detail: `agent backend ${context.backend} is not available`,
						}),
					);
				}
				const options = {
					cwd: context.cwd,
					resume: Option.some(context.nativeRef),
					sessionId: context.identity.sessionId,
					tools: toolsFor(context),
				};
				return Effect.gen(function* () {
					const sink = yield* sinkFor(context.identity.sessionId);
					yield* fabric.start(backend, options, sink, (attachment) =>
						admitRecoveredSession(context, attachment),
					);
				}).pipe(
					Effect.catchTag("SessionAttachmentFailure", (failure) =>
						Effect.fail(new SessionRecoveryHeld({ detail: failure.detail })),
					),
				);
			};
			const recoveryRuntime = SessionRecoveryRuntime.of({
				resume: resumeSession,
			});
			const recover = yield* makeRecoveryKind.pipe(
				Effect.provideService(SessionRecoveryRuntime, recoveryRuntime),
			);
			yield* sweepBerths(runners);
			const aliveAgents = db.Agent.where({ status: "alive" })
				.all()
				.pipe(
					Effect.map((agents) => agents.length),
					Effect.provideContext(executors),
					Effect.orDie,
				);
			const makeVoyages = yield* makeVoyageProcedures;
			const retire = makeRetireKind(deps);
			return {
				backends: [...backends.keys()],
				boards: makeBoardProcedures(deps),
				changes: makeChanges(deps),
				gauges: { [AGENTS_ALIVE_GAUGE]: aliveAgents },
				interruptSession: fabric.interrupt,
				kernelReach,
				kinds: [spawn, recover, retire],
				repos: makeRepoRegistry(deps),
				recover,
				retire,
				spawn,
				voyages: makeVoyages(deps),
			};
		}),
	).pipe(Layer.provideMerge(capabilities));
};
