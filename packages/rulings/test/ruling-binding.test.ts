import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { TestClock } from "effect/testing";
import { asked, seedFleet } from "#test/rulings-harness.ts";

it.effectApp("binds effective fleet rulings and named subjects once, newest first", function* () {
	yield* seedFleet;
	const rulings = yield* Rulings;
	const fleet = yield* rulings.request({ ...asked, radius: "fleet", subjects: [{ kind: "tag", tag: "survey" }] });
	const widened = yield* rulings.request(asked);
	const narrowed = yield* rulings.request({ ...asked, radius: "fleet" });
	const named = yield* rulings.request({ ...asked, subjects: [{ kind: "tag", tag: "survey" }] });
	const unrelated = yield* rulings.request(asked);
	yield* rulings.reclassify({ by: "admiral", radius: "fleet", rulingId: widened.id });
	yield* TestClock.adjust(1_000);
	yield* rulings.reclassify({ by: "admiral", urgency: "eventual", rulingId: widened.id });
	yield* rulings.reclassify({ by: "admiral", radius: "voyage", rulingId: narrowed.id });
	yield* rulings.reclassify({ by: "admiral", radius: "fleet", rulingId: named.id });
	yield* TestClock.adjust(1_000);
	yield* rulings.reclassify({ by: "admiral", radius: "voyage", rulingId: named.id });
	for (const ruling of [fleet, widened, narrowed, named, unrelated]) {
		yield* rulings.rule({ answer: "trust the soundings", by: "admiral", rulingId: ruling.id });
		yield* TestClock.adjust(1_000);
	}

	expect((yield* rulings.binding([])).map((ruling) => ruling.id)).toEqual([widened.id, fleet.id]);
	expect((yield* rulings.binding([{ kind: "tag", tag: "survey" }])).map((ruling) => ruling.id)).toEqual([named.id, widened.id, fleet.id]);
});
