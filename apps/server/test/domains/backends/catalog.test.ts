import { expect } from "vitest";
import { answered, it } from "#testing/entry.ts";

it.app("reads the listing failure", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "opencode", failure: "opencode answered nothing", models: [] });

	expect(yield* answered(catalogue.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: "opencode answered nothing" });
});

it.app("has no failure before the first listing", function* (app) {
	expect(yield* answered(app.api.backends.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: null });
});
