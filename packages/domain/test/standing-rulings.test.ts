import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { rulingLine, standingRulingsFor } from "#standing-rulings.ts";
import { proclaimed, seedAsker, unruled } from "#test/ruling-fixtures.ts";

const it = persistenceIt();

const layer = RulingsLive.pipe(Layer.provideMerge(DomainFeedsLive));

const stranger = {
	agentId: "agent-stranger",
	pieceId: Option.none<string>(),
	voyageId: Option.none<string>(),
};

// why: what binds an agent is read from the radius a ruling was ruled under,
// so a request reclassified to the fleet binds a reader it never named.
it.effectDB("binds by the radius a ruling was reclassified to", function* () {
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

		expect(bound.map((ruling) => ruling.id)).toEqual([widened.id]);
	}).pipe(Effect.provide(layer));
});

// why: a rule the admiral wrote for itself reads as proclaimed rather than as
// an agent's question that happened to be answered, because who asked is part
// of how far the answer reaches.
it.effectDB("names the admiral as the one who proclaimed a rule", function* () {
	yield* Effect.gen(function* () {
		const rulings = yield* Rulings;
		yield* proclaimed("may any voyage dredge?", "never", {
			radius: "fleet",
			subjects: [],
		});

		const [standing] = yield* rulings.standing([]);

		expect(standing === undefined ? "" : rulingLine(standing)).toContain("proclaimed by the admiral");
	}).pipe(Effect.provide(layer));
});
