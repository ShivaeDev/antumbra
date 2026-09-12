import { answered, it } from "@antumbra/app-testing/entry.ts";
import { expect } from "vitest";

it.app("clears the listing failure after a successful refresh", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "opencode", failure: "opencode answered nothing", models: [] });

	expect(yield* answered(catalogue.catalog({ backend: "opencode" }))).toEqual({
		backend: "opencode",
		failure: "opencode answered nothing",
		imageInput: null,
	});

	yield* catalogue.listModels({ backend: "opencode", failure: null, models: [] });

	expect(yield* answered(catalogue.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: null, imageInput: null });
});

it.app("has no failure before the first listing", function* (app) {
	expect(yield* answered(app.api.backends.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: null, imageInput: null });
});
