import type { DomainFeedsService } from "@antumbra/domain-feeds";
import type { PayloadInvalid, UnregisteredIntentTag } from "@antumbra/kernel";
import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import type { AgentBackend, ChangeHost, Runner } from "@antumbra/plugin-api";
import { type Context, Effect } from "effect";
import type { EventSink, SessionFabricService } from "#fabric.ts";

export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

// why: intent executes run inside kernel fibers where R must be never, so the
// domain captures its services once and every kind closes over this bundle.
export interface AgentDeps {
	readonly backends: ReadonlyMap<string, AgentBackend>;
	readonly changeHosts: ReadonlyMap<string, ChangeHost>;
	readonly db: DatabaseService;
	readonly executors: Context.Context<WriteExecutors>;
	readonly fabric: SessionFabricService;
	readonly feeds: DomainFeedsService;
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
