import { answered, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { catalog } from "#queries/catalog.ts";
import { models } from "#queries/models.ts";

const listed = {
	backend: "codex",
	failure: null,
	models: [{ model: "gpt", name: "GPT", defaultEffort: null, efforts: [], isDefault: true }],
} as const;

it.app("remembers an unchanged listing without refreshing its readers", function* (app) {
	const offered = yield* app.live(models, { backend: "codex" });
	const catalogue = yield* app.live(catalog, { backend: "codex" });
	yield* app.settle();

	const first = yield* app.api.backends.listModels({ ...listed, requestId: Request.make("first-listing") });
	yield* app.settle();
	const beforeModels = yield* offered.seen;
	const beforeCatalog = yield* catalogue.seen;

	const requestId = Request.make("unchanged-listing");
	expect(yield* app.api.backends.listModels({ ...listed, requestId })).toBe(first);
	yield* app.settle();
	expect(yield* offered.seen).toEqual(beforeModels);
	expect(yield* catalogue.seen).toEqual(beforeCatalog);

	const changed = { ...listed, models: [{ ...listed.models[0], name: "GPT updated" }] };
	expect(yield* app.api.backends.listModels(changed)).toBeGreaterThan(first);
	yield* app.settle();
	const afterModels = yield* offered.seen;
	const afterCatalog = yield* catalogue.seen;

	expect(yield* app.api.backends.listModels({ ...listed, requestId })).toBe(first);
	yield* app.settle();
	expect(yield* offered.seen).toEqual(afterModels);
	expect(yield* catalogue.seen).toEqual(afterCatalog);
	expect(yield* answered(app.api.backends.models({ backend: "codex" }), "the current model listing")).toMatchObject([{ name: "GPT updated" }]);
});
