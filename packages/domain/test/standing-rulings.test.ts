import { Rulings, RulingsLive } from "@antumbra/rulings";
import { it } from "@antumbra/testing-runtime/domain";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import { proclaimed, seedAsker, unruled } from "#test/ruling-fixtures.ts";

const layer = RulingsLive;

const stranger = {
	agentId: "agent-stranger",
	pieceId: Option.none<string>(),
	voyageId: Option.none<string>(),
};

it.effectApp("binds by the radius a ruling was reclassified to", function* () {
	yield* Effect.gen(function* () {
		yield* seedAsker;
		const rulings = yield* Rulings;
		const widened = yield* unruled("may any voyage dredge?", {
			radius: "voyage",
			subjects: [],
		});
		const narrow = yield* unruled("may we anchor overnight?", {
			radius: "voyage",
			subjects: [],
		});
		yield* rulings.reclassify({
			by: "admiral",
			radius: "fleet",
			rulingId: widened.id,
		});
		yield* Effect.forEach([widened, narrow], (ruling) => rulings.rule({ answer: "never", by: "admiral", rulingId: ruling.id }));

		const bound = yield* standingRulingsFor(stranger);
		const boundIds = bound.map((ruling) => ruling.id);

		expect(boundIds).toContain(widened.id);
		expect(boundIds).not.toContain(narrow.id);
	}).pipe(Effect.provide(layer));
});

it.effectApp("names the admiral as the one who proclaimed a rule", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;
		const proclaimedRuling = yield* proclaimed("may any voyage dredge?", "never", {
			radius: "fleet",
			subjects: [{ kind: "tag", tag: "proclaimed-by-admiral" }],
		});

		const [standing] = yield* rulings.standing([{ kind: "tag", tag: "proclaimed-by-admiral" }]);

		expect(standing?.id).toBe(proclaimedRuling.id);
		expect(standing === undefined ? "" : rulingLine(standing)).toContain("proclaimed by the admiral");
	}).pipe(Effect.provide(layer));
});
