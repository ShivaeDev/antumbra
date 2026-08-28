import { Effect, Layer } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { openRulings } from "#fixtures/ruling.ts";
import { RulingRefused, RulingSource } from "#rulings.ts";

const known = new Set(openRulings.rulings.map((ruling) => ruling.id));

// why: the fixture refuses exactly what the record refuses — a ruling nobody
// asked — so a window standing on fixtures meets the same sentence a live
// host would give it rather than an always-succeeding stub.
export const rulingFixture = (feeds: FixtureFeeds) =>
	Layer.succeed(RulingSource, {
		open: Effect.succeed(openRulings),
		openFeed: feeds.rulings,
		rule: (request) =>
			known.has(request.rulingId)
				? Effect.succeed({ rulingId: request.rulingId })
				: new RulingRefused({
						reason: `no open ruling: ${request.rulingId}`,
					}),
	});
