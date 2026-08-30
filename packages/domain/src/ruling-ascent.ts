import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAscentMail } from "#ruling-ascent-mail.ts";
import { rungHolder } from "#ruling-ascent-rung.ts";
import { voyageWorldTicks } from "#voyage-feed.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) => act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

// why: the mailbox deduplicates by source reference, so the send is safe to
// repeat every pass and needs no mark of its own. Dedup is per mailbox, which
// is the right grain here: a request still open when the rung changes hands
// climbs to whoever holds the office now.
const ascendOne = (ruling: Ruling, toAgentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const requester = ruling.requester;
		// why: an agent holding the rung above its own question does not hear it
		// back from itself. A question it could settle it would have settled; one
		// it cannot is the next rung's, and mail to itself would only bury it.
		if (requester.kind !== "agent" || requester.agentId === toAgentId) {
			return;
		}
		yield* boards.mail({
			authorAgentId: Option.none(),
			body: rulingAscentMail(ruling, requester.agentId),
			precedence: "priority",
			sourceRef: `ruling-ascent:${ruling.id}`,
			toAgentId,
		});
	});

const onePass = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const climbing = yield* rulings.awaitingAscent();
	if (climbing.length === 0) {
		return;
	}
	const source = yield* VoyageWorldSource;
	const world = yield* source.read;
	yield* Effect.forEach(
		climbing,
		(ruling) =>
			Option.match(rungHolder(world, ruling), {
				onNone: () => Effect.void,
				onSome: (toAgentId) => guarded(ascendOne(ruling, toAgentId), "a ruling could not be carried to the rung it waits on"),
			}),
		{ discard: true },
	);
});

// why: a request reaches the authority above it the way everything reaches an
// agent — as mail — and what is owed is read off the record every pass rather
// than sent at the moment of asking, so a request made while its rung had
// nobody on it still arrives once somebody is hailed.
export const RulingAscentLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		// why: subscribed before the first read, so a request landing between the
		// read and the subscription climbs on the next ring rather than waiting
		// for one that never comes.
		const notices = yield* feeds.subscribeRulingRefresh();
		// why: who holds a rung is read off the voyage world rather than off the
		// ruling record, so the world changing is as much a reason to walk what
		// is owed as a ruling write is — a request raised while its rung had
		// nobody on it climbs on the hail instead of on the next ruling.
		const world = yield* voyageWorldTicks(feeds);
		const pass = guarded(onePass, "the ruling ascent pass failed");
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.merge(Stream.fromSubscription(notices), world).pipe(Stream.runForEach(() => pass)))));
	}),
);
