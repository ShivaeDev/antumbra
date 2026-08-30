import { Effect, Layer } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { openRulings, standingRulings } from "#fixtures/ruling.ts";
import { RulingRefused, RulingSource } from "#rulings/source.ts";

const known = new Set(openRulings.rulings.map((ruling) => ruling.id));
const standing = new Set(standingRulings.rulings.map((ruling) => ruling.id));

// why: a proclamation lands as one new standing ruling, so the fixture names
// the id a live host would hand back rather than echoing the request.
export const proclaimedRulingId = "ruling-proclaimed";

const onOpen = (rulingId: string) =>
	known.has(rulingId) ? Effect.succeed({ rulingId }) : new RulingRefused({ reason: `no open ruling: ${rulingId}` });

const onStanding = (rulingId: string) =>
	standing.has(rulingId) ? Effect.succeed({ rulingId }) : new RulingRefused({ reason: `no standing ruling: ${rulingId}` });

// why: the fixture refuses exactly what the record refuses — a ruling nobody
// asked, a proclamation with no words to stand on, a reclassification naming no
// axis, a supersession or a withdrawal of one that does not stand — so a window
// standing on fixtures meets the same sentence a live host would give it rather
// than a stub.
export const rulingFixture = (feeds: FixtureFeeds) =>
	Layer.succeed(RulingSource, {
		open: Effect.succeed(openRulings),
		openFeed: feeds.rulings,
		proclaim: (request) =>
			request.answer.trim() === ""
				? new RulingRefused({ reason: "a proclamation stands on no words" })
				: Effect.succeed({ rulingId: proclaimedRulingId }),
		reclassify: (request) =>
			request.radius === undefined && request.urgency === undefined
				? new RulingRefused({
						reason: `reclassifying ${request.rulingId} names no axis`,
					})
				: onOpen(request.rulingId),
		rule: (request) => onOpen(request.rulingId),
		standing: Effect.succeed(standingRulings),
		standingFeed: feeds.standing,
		supersede: (request) =>
			standing.has(request.rulingId) && standing.has(request.byRulingId)
				? Effect.succeed(request)
				: new RulingRefused({
						reason: `no standing ruling: ${request.rulingId}`,
					}),
		withdraw: (request) => onStanding(request.rulingId),
	});
