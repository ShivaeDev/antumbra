import { expect } from "vitest";
import { answered, it } from "#test/kit.ts";

it.app("carries the failure the listing reported", function* (app) {
	const catalogue = app.api.backends;
	yield* catalogue.listModels({ backend: "opencode", failure: "opencode answered nothing", models: [] });

	expect(yield* answered(catalogue.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: "opencode answered nothing" });
});

it.app("answers without a failure before anything has been listed", function* (app) {
	expect(yield* answered(app.api.backends.catalog({ backend: "opencode" }))).toEqual({ backend: "opencode", failure: null });
});
