import {
	type EventQuery,
	SessionEvent,
	SightFailure,
	SightSource,
	type SpawnRequest,
} from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Layer, PubSub, Schema, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import type { StoredEvent } from "#feeds.ts";
import { fleetSnapshot } from "#sight-fleet.ts";

const describe = (cause: unknown): string => {
	if (cause instanceof Error && cause.message !== "") {
		return cause.message;
	}
	if (typeof cause === "object" && cause !== null && "_tag" in cause) {
		return String(cause._tag);
	}
	return String(cause);
};

const toFailure = (cause: unknown) =>
	new SightFailure({ message: describe(cause) });

const pastRehydrated =
	(query: EventQuery, lastSeq: number) => (event: StoredEvent) =>
		event.sessionId === query.sessionId && event.seq > lastSeq;

export const SightSourceLive = Layer.effect(SightSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
			Effect.provideContext(effect, executors);
		const decodeEvents = Schema.decodeUnknownEffect(Schema.Array(SessionEvent));

		const fleet = provide(fleetSnapshot(db, domain.backends)).pipe(
			Effect.mapError(toFailure),
		);

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
						Stream.filter(pastRehydrated(query, lastSeq)),
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
						repos: request.repos,
						role: request.role,
						// why: the sole runner in v1 — the field joins the contract when
						// a second runner exists to choose between.
						runner: "local",
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
