import { Effect, Layer } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { openRulings } from "#fixtures/ruling.ts";
import { RulingRefused, RulingSource } from "#rulings.ts";

const known = new Set(openRulings.rulings.map((ruling) => ruling.id));

const onOpen = (rulingId: string) =>
	known.has(rulingId)
		? Effect.succeed({ rulingId })
		: new RulingRefused({ reason: `no open ruling: ${rulingId}` });

// why: the fixture refuses exactly what the record refuses — a ruling nobody
// asked, a reclassification naming no axis — so a window standing on fixtures
// meets the same sentence a live host would give it rather than a stub.
export const rulingFixture = (feeds: FixtureFeeds) =>
	Layer.succeed(RulingSource, {
		open: Effect.succeed(openRulings),
		openFeed: feeds.rulings,
		reclassify: (request) =>
			request.radius === undefined && request.urgency === undefined
				? new RulingRefused({
						reason: `reclassifying ${request.rulingId} names no axis`,
					})
				: onOpen(request.rulingId),
		rule: (request) => onOpen(request.rulingId),
	});
