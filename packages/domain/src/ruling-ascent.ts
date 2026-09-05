import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option, Stream } from "effect";
import { rulingAscentMail } from "#ruling-ascent-mail.ts";
import { rungHolders } from "#ruling-ascent-rung.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) => act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

// Mail deduplicates sourceRef per mailbox, so each pass may resend to the current rung holder.
const ascendOne = (ruling: Ruling, toAgentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const requester = ruling.requester;
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
	const holders = yield* rungHolders(climbing);
	yield* Effect.forEach(
		climbing,
		(ruling) =>
			Option.match(Option.fromUndefinedOr(holders.get(ruling.id)), {
				onNone: () => Effect.void,
				onSome: (toAgentId) => guarded(ascendOne(ruling, toAgentId), "a ruling could not be carried to the rung it waits on"),
			}),
		{ discard: true },
	);
});

export const RulingAscentLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		// Subscribe before the initial pass so a concurrent ruling refresh is not missed.
		const notices = yield* feeds.subscribeRulingRefresh();
		const voyageWrites = yield* feeds.subscribeVoyageRefresh();
		const fleetWrites = yield* feeds.subscribeFleetRefresh();
		const world = Stream.merge(Stream.fromSubscription(voyageWrites), Stream.fromSubscription(fleetWrites));
		const pass = guarded(onePass, "the ruling ascent pass failed");
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.merge(Stream.fromSubscription(notices), world).pipe(Stream.runForEach(() => pass)))));
	}),
);
