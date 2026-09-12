import { it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";
import { forVoyage } from "#queries/for-voyage.ts";
import { reef } from "#test/kit.ts";

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

it.app("updates subscribers when the fleet default a voyage inherits changes", function* (app) {
	const live = yield* app.live(forVoyage, { voyageId: reef });
	yield* app.settle();

	yield* app.api.roleSettings.choose({ backend: "codex", effort: null, model: "gpt-5", role: "captain", scope: "fleet" });
	yield* app.settle();

	const seen = yield* live.seen;
	expect(seen.at(-1)?.at(0)?.resolved).toMatchObject({ backend: { source: "fleet", value: "codex" }, model: { source: "fleet", value: "gpt-5" } });
});
