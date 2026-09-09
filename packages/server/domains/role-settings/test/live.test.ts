import { expect } from "vitest";
import { forVoyage } from "#queries/for-voyage.ts";
import { it, reef, shallows } from "#test/kit.ts";

it.app("a voyage's settings emit again when a choice lands in its scope", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: reef });
	yield* app.settle();
	const before = (yield* live.seen).length;

	yield* app.api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: reef });
	yield* app.settle();

	const seen = yield* live.seen;
	expect(seen.length).toBeGreaterThan(before);
	expect(seen.at(-1)?.at(0)).toMatchObject({ backend: "claude", role: "captain" });
});

it.app("a choice in another voyage's scope leaves the live query alone", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: reef });
	yield* app.settle();
	const before = (yield* live.seen).length;

	yield* app.api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: shallows });
	yield* app.settle();

	expect(yield* live.seen).toHaveLength(before);
});
