import type { DomainFeedsService } from "@antumbra/domain-feeds";
import type { PayloadInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { type Context, type Deferred, Effect } from "effect";
import type { EventSink, SessionFabricService } from "#fabric.ts";
import type { SpawnFields } from "#spawn.ts";

export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

// why: only the kernel schedules lifecycle work, and the kernel is built on
// top of this bundle. The reach is handed over once the kernel is up, so a
// caller waits for the path to exist rather than finding a half-built one.
export interface KernelReach {
	readonly queueSiesta: (sessionId: string) => Effect.Effect<void>;
	readonly submitRecovery: (
		sessionId: string,
	) => Effect.Effect<string, SpawnRefused>;
	readonly submitSpawn: (
		payload: SpawnFields,
	) => Effect.Effect<string, SpawnRefused>;
}

// why: intent executes run inside kernel fibers where R must be never, so the
// domain captures its services once and every kind closes over this bundle.
export interface AgentDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly changeHosts: ReadonlyMap<string, ChangeHost>;
	readonly db: DatabaseService;
	readonly executors: Context.Context<WriteExecutors>;
	readonly fabric: SessionFabricService;
	readonly feeds: DomainFeedsService;
	readonly kernelReach: Deferred.Deferred<KernelReach>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: (
		sessionId: string,
	) => Effect.Effect<EventSink, PrismaError>;
	readonly writer: {
		readonly write: <A, E, R>(
			program: Effect.Effect<A, E, R>,
		) => Effect.Effect<A, E | PrismaError, R | WriteExecutors>;
	};
}

export const provideExecutors =
	(deps: AgentDeps) =>
	<A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, deps.executors);
