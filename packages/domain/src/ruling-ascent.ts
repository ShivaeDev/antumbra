import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAscentMail } from "#ruling-ascent-mail.ts";
import { captainOf } from "#voyage-captain.ts";
import { voyageWorldTicks } from "#voyage-feed.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) =>
	act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

// why: the fleet's authority is not a rank of its own — it is the captain of
// the one voyage whose kind speaks for the fleet, read the way every other
// reading of a captain reads it. A flagship that has never been hailed has
// nobody to carry a request to, which is a wait rather than a failure.
const flagshipCaptain = Effect.gen(function* () {
	const source = yield* VoyageWorldSource;
	const world = yield* source.read;
	const flagship = world.voyages.find((voyage) => voyage.kind === "flagship");
	return flagship === undefined
		? Option.none<string>()
		: Option.map(captainOf(world, flagship.id), (captain) => captain.agentId);
});

// why: the mailbox deduplicates by source reference, so the send is safe to
// repeat every pass and needs no mark of its own. Dedup is per mailbox, which
// is the right grain here: a request that is still open when the flagship is
// captained afresh climbs to whoever holds the office now.
const ascendOne = (ruling: Ruling, toAgentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const requester = ruling.requester;
		// why: the flagship captain's own ask does not climb back to itself. A
		// question it could settle it would have settled; one it cannot is the
		// admiral's, and mail to itself would only bury the two together.
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
	const captain = yield* flagshipCaptain;
	if (Option.isNone(captain)) {
		return;
	}
	yield* Effect.forEach(
		climbing,
		(ruling) =>
			guarded(
				ascendOne(ruling, captain.value),
				"a fleet ruling could not be carried to the flagship",
			),
		{ discard: true },
	);
});

// why: a request reaches the authority above it the way everything reaches an
// agent — as mail — and what is owed is read off the record every pass rather
// than sent at the moment of asking, so a request made while the flagship had
// no captain still arrives once one is hailed.
export const RulingAscentLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		// why: subscribed before the first read, so a request landing between the
		// read and the subscription climbs on the next ring rather than waiting
		// for one that never comes.
		const notices = yield* feeds.subscribeRulingRefresh();
		// why: who may answer is read off the voyage world rather than off the
		// ruling record, so the world changing is as much a reason to walk what
		// is owed as a ruling write is — a request raised while the flagship had
		// no captain climbs on the hail instead of on the next ruling.
		const world = yield* voyageWorldTicks(feeds);
		const pass = guarded(onePass, "the ruling ascent pass failed");
		yield* Effect.forkScoped(
			pass.pipe(
				Effect.andThen(
					Stream.merge(Stream.fromSubscription(notices), world).pipe(
						Stream.runForEach(() => pass),
					),
				),
			),
		);
	}),
);
