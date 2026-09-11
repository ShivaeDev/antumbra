import { Effect } from "effect";
import { expect } from "vitest";
import { FLAGSHIP_REQUEST } from "#ids.ts";
import { answered, it, opening } from "#test/kit.ts";

it.app("opening a voyage seats the captain and the crew where the role settings read them", function* (app) {
	yield* app.api.voyages.open({ ...opening, captainBackend: "claude", captainEffort: "high", captainModel: "opus" });

	const [opened] = yield* app.rows.voyage.where({});
	expect(opened).toMatchObject({ context: "the reef is uncharted", kind: "voyage", name: "Chart the reef", northStar: "every shoal is known" });
	expect(yield* answered(app.api.roleSettings.forVoyage({ voyageId: opened?.id ?? "" }))).toMatchObject([
		{ backend: "claude", effort: "high", model: "opus", role: "captain" },
		{ backend: null, effort: null, model: null, role: "crew" },
	]);
});

it.app("refuses a voyage with no name and stores nothing", function* (app) {
	const refused = yield* Effect.flip(app.api.voyages.open({ ...opening, name: "   " }));

	expect(refused).toMatchObject({ _tag: "Blank", field: "name", message: "A voyage needs a name" });
	expect(yield* app.rows.voyage.count({})).toBe(0);
	expect(yield* app.rows.roleSetting.count({})).toBe(0);
});

it.app("opens the flagship once however often the same request arrives", function* (app) {
	const first = yield* app.api.voyages.open({ ...opening, kind: "flagship", requestId: FLAGSHIP_REQUEST });
	const again = yield* app.api.voyages.open({ ...opening, kind: "flagship", requestId: FLAGSHIP_REQUEST });

	expect(again).toBe(first);
	expect(yield* app.rows.voyage.count({})).toBe(1);
});
