import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import type { AgentBackend } from "@antumbra/plugin-api";
import { type Context, Effect } from "effect";
import type { EventSink, SessionFabric } from "#fabric.ts";

// why: intent executes run inside kernel fibers where R must be never, so the
// domain captures its services once and every kind closes over this bundle.
export interface AgentDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly db: DatabaseService;
	readonly executors: Context.Context<WriteExecutors>;
	readonly fabric: SessionFabric;
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
