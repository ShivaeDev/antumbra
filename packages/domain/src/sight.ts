import {
	type EventQuery,
	type RepoRegistration,
	type SessionEvent,
	SightSource,
	type SpawnRequest,
} from "@antumbra/contract";
import { DomainFeeds, type StoredEvent } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors } from "@antumbra/persistence";
import { projectHistoricalAgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect, Layer, PubSub, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { SessionMessageEmpty } from "#errors.ts";
import { toFailure } from "#sight-failure.ts";
import { fleetSnapshot } from "#sight-fleet.ts";
import { pendingIntents } from "#sight-intents.ts";

const pastRehydrated =
	(query: EventQuery, lastSeq: number) => (event: StoredEvent) =>
		event.sessionId === query.sessionId && event.seq > lastSeq;

const projectSessionEvent = (row: StoredEvent): SessionEvent => ({
	event: projectHistoricalAgentEvent(row.kind, row.payload),
	seq: row.seq,
	sessionId: row.sessionId,
});

export const SightSourceLive = Layer.effect(SightSource)(
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const feeds = yield* DomainFeeds;
		const kernel = yield* Kernel;
		const db = yield* Database;
		const executors = yield* Effect.context<WriteExecutors>();
		const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
			Effect.provideContext(effect, executors);
		const fleet = pendingIntents.pipe(
			Effect.provideService(AgentDomain, domain),
			Effect.provideService(Kernel, kernel),
			Effect.flatMap((intents) => fleetSnapshot(domain.backends, intents)),
			Effect.provideService(Database, db),
			provide,
			Effect.mapError(toFailure),
		);

		const sessionEvents = (query: EventQuery) =>
			provide(
				db.SessionEvent.where({ sessionId: query.sessionId })
					.orderBy((event) => event.seq.asc())
					.all(),
			).pipe(
				Effect.map((rows) =>
					rows
						.filter((event) => event.seq >= query.fromSeq)
						.map(projectSessionEvent),
				),
				Effect.mapError(toFailure),
			);

		// why: subscribe before reading the log, then admit only live events past
		// the last rehydrated seq — a notification can be redundant but an event
		// can never be missed or doubled.
		const sessionEventFeed = (query: EventQuery) =>
			Stream.unwrap(
				Effect.gen(function* () {
					const subscription = yield* PubSub.subscribe(feeds.events);
					const rehydrated = yield* sessionEvents(query);
					const lastSeq = rehydrated.at(-1)?.seq ?? query.fromSeq - 1;
					const live = Stream.fromSubscription(subscription).pipe(
						Stream.filter(pastRehydrated(query, lastSeq)),
						Stream.map(projectSessionEvent),
					);
					return Stream.fromArray(rehydrated).pipe(Stream.concat(live));
				}),
			);

		const fleetFeed = Stream.unwrap(
			Effect.gen(function* () {
				const subscription = yield* PubSub.subscribe(feeds.fleet);
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

		// why: the admiral speaks to a Session that is live right now; a Session
		// with no attachment refuses rather than holding the words for later.
		const send = (sessionId: string, text: string) =>
			Effect.gen(function* () {
				if (text.trim().length === 0) {
					return yield* new SessionMessageEmpty({ sessionId });
				}
				yield* domain.sendToSession(sessionId, text);
			}).pipe(Effect.mapError(toFailure));

		const registerRepo = (registration: RepoRegistration) =>
			domain.repos.register(registration).pipe(Effect.mapError(toFailure));

		const forgetRepo = (repoId: string) =>
			domain.repos.forget(repoId).pipe(Effect.mapError(toFailure));

		return {
			fleet,
			fleetFeed,
			forgetRepo,
			interrupt,
			registerRepo,
			retire,
			send,
			sessionEventFeed,
			sessionEvents,
			spawn,
		};
	}),
);
