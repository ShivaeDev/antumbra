import { answered, it } from "@antumbra/app-testing/entry.ts";
import { FLAGSHIP_REQUEST } from "@antumbra/domain-voyages/ids.ts";
import { expect } from "vitest";

it.app("opens the flagship voyage when the application starts", function* (app) {
	const sailing = yield* answered(app.api.voyages.list({}));

	expect(sailing).toHaveLength(1);
	expect(sailing[0]).toMatchObject({ id: FLAGSHIP_REQUEST, kind: "flagship", name: "Flagship", northStar: "The fleet sails well." });
});
