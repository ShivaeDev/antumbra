import {
	type AgentSummary,
	type EventQuery,
	type Fleet,
	SessionEvent,
	SightFailure,
	SightSource,
	type SpawnRequest,
} from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Layer, PubSub, Schema, Stream } from "effect";
import { AgentDomain } from "#domain.ts";

const describe = (cause: unknown): string =>
	cause instanceof Error && cause.message !== ""
		? cause.message
		: typeof cause === "object" && cause !== null && "_tag" in cause
			? String(cause._tag)
			: String(cause);

const toFailure = (cause: unknown) =>
	new SightFailure({ message: describe(cause) });

export const SightSourceLive = Layer.effect(SightSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
			Effect.provideContext(effect, executors);
		const decodeEvents = Schema.decodeUnknownEffect(Schema.Array(SessionEvent));

		const fleet = provide(
			Effect.gen(function* () {
				const agents = yield* db.Agent.orderBy((agent) =>
					agent.createdAt.asc(),
				).all();
				const sessions = yield* db.AgentSession.orderBy((session) =>
					session.createdAt.asc(),
				).all();
				const summaries: ReadonlyArray<AgentSummary> = agents.map((agent) => ({
					charter: agent.charter,
					id: agent.id,
					role: agent.role,
					sessions: sessions
						.filter((session) => session.agentId === agent.id)
						.map((session) => ({
							cwd: session.cwd,
							id: session.id,
							status: session.status,
						})),
					status: agent.status,
				}));
				return { agents: summaries } satisfies Fleet;
			}),
		).pipe(Effect.mapError(toFailure));

		const sessionEvents = (query: EventQuery) =>
			provide(
				db.SessionEvent.where({ sessionId: query.sessionId })
					.orderBy((event) => event.seq.asc())
					.all(),
			).pipe(
				Effect.flatMap(decodeEvents),
				Effect.map((rows) =>
					rows.filter((event) => event.seq >= query.fromSeq),
				),
				Effect.mapError(toFailure),
			);

		// why: subscribe before reading the log, then admit only live events past
		// the last rehydrated seq — a notification can be redundant but an event
		// can never be missed or doubled.
		const sessionEventFeed = (query: EventQuery) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* PubSub.subscribe(domain.feeds.events);
					const rehydrated = yield* sessionEvents(query);
					const lastSeq = rehydrated.at(-1)?.seq ?? query.fromSeq - 1;
					const live = Stream.fromSubscription(subscription).pipe(
						Stream.filter(
							(event) =>
								event.sessionId === query.sessionId && event.seq > lastSeq,
						),
					);
					return Stream.fromArray(rehydrated).pipe(Stream.concat(live));
				}),
			);

		const fleetFeed = Stream.unwrap(
			Effect.gen(function* () {
				const subscription = yield* PubSub.subscribe(domain.feeds.fleet);
				const refresh = Stream.fromSubscription(subscription).pipe(
					Stream.mapEffect(() => fleet),
				);
				return Stream.fromEffect(fleet).pipe(Stream.concat(refresh));
			}),
		);

		const spawn = (request: SpawnRequest) =>
			Effect.gen(function* () {
				const agentId = crypto.randomUUID();
				const sessionId = crypto.randomUUID();
				yield* provide(
					kernel.submit(domain.spawn, {
						agentId,
						backend: request.backend,
						charter: request.charter,
						cwd: request.cwd,
						role: request.role,
						sessionId,
					}),
				);
				return { agentId, sessionId };
			}).pipe(Effect.mapError(toFailure));

		const retire = (agentId: string) =>
			provide(kernel.submit(domain.retire, { agentId })).pipe(
				Effect.asVoid,
				Effect.mapError(toFailure),
			);

		const interrupt = (sessionId: string) =>
			domain.interruptSession(sessionId).pipe(Effect.mapError(toFailure));

		return {
			fleet,
			fleetFeed,
			interrupt,
			retire,
			sessionEventFeed,
			sessionEvents,
			spawn,
		};
	}),
);
