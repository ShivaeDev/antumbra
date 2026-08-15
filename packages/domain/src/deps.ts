import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import type { AgentBackend, Runner } from "@antumbra/plugin-api";
import { type Context, type Deferred, Effect } from "effect";
import type { EventSink, SessionFabric } from "#fabric.ts";
import type { DomainFeeds } from "#feeds.ts";

// why: a crew member standing down asks for its own retire, and only the
// kernel schedules that — but the kernel is built on top of this bundle. The
// queue is handed over once the kernel is up, so a tool reaching for it waits
// for the path to exist rather than finding a half-built one.
export type QueueRetire = (agentId: string) => Effect.Effect<void>;

// why: intent executes run inside kernel fibers where R must be never, so the
// domain captures its services once and every kind closes over this bundle.
export interface AgentDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly db: DatabaseService;
	readonly executors: Context.Context<WriteExecutors>;
	readonly fabric: SessionFabric;
	readonly feeds: DomainFeeds;
	readonly retireQueue: Deferred.Deferred<QueueRetire>;
	readonly runners: ReadonlyMap<string, Runner>;
	readonly sinkFor: (sessionId: string) => Effect.Effect<EventSink>;
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
