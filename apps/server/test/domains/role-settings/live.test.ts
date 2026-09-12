import { forVoyage } from "@antumbra/domain-role-settings/queries/for-voyage.ts";
import { expect } from "vitest";
import { reef, shallows } from "#test/domains/role-settings/kit.ts";
import { it } from "#testing/entry.ts";

it.app("updates subscribers when a choice changes", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: reef });
	yield* app.settle();
	const before = (yield* live.seen).length;

	yield* app.api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: reef });
	yield* app.settle();

	const seen = yield* live.seen;
	expect(seen.length).toBeGreaterThan(before);
	expect(seen.at(-1)?.at(0)).toMatchObject({ backend: "claude", role: "captain" });
});

it.app("ignores choices in another scope", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: reef });
	yield* app.settle();
	const before = (yield* live.seen).length;

	yield* app.api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: shallows });
	yield* app.settle();

	expect(yield* live.seen).toHaveLength(before);
});
