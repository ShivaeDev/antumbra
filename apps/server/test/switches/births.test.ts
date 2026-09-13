import { knownModels } from "@antumbra/app-testing/backends.ts";
import { answered, eventually, it } from "@antumbra/app-testing/entry.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { launched, opened, PIECE, VOYAGE, wentOnElsewhere } from "#test/switches/kit.ts";

const HAIL = Request.make("hail");

it.app("a launched piece gets no agent while its spawn switch is off, and gets one when it goes back on", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.settings.setFlag({ key: "spawnForPiece", on: false });
	yield* launched(app);
	yield* wentOnElsewhere(app);
	expect((yield* answered(app.api.agents.births({}), "the births to be listed")).filter((born) => born.pieceId !== null)).toEqual([]);
	yield* app.api.settings.setFlag({ key: "spawnForPiece", on: true });
	yield* eventually(app.api.agents.births({}), (births) => births.some((born) => born.pieceId === PIECE), "the piece's birth to appear");
});

it.app("a hail from an agent spawns no captain while its spawn switch is off, and spawns one when it goes back on", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.settings.setFlag({ key: "spawnOnHail", on: false });
	yield* opened(app);
	yield* app.api.agents.hail({ by: "agent", requestId: HAIL, voyageId: VOYAGE });
	yield* wentOnElsewhere(app);
	expect((yield* answered(app.api.agents.births({}), "the births to be listed")).filter((born) => born.source === "hail")).toMatchObject([
		{ status: "requested" },
	]);
	yield* app.api.settings.setFlag({ key: "spawnOnHail", on: true });
	yield* eventually(
		app.api.agents.births({}),
		(births) => births.some((born) => born.source === "hail" && born.status !== "requested"),
		"the hailed birth to leave requested",
	);
});

it.app("a hail the admiral presses spawns a captain even while everything is held", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.settings.setFlag({ key: "holdEverything", on: true });
	yield* opened(app);
	yield* app.api.agents.hail({ by: "admiral", requestId: HAIL, voyageId: VOYAGE });
	yield* eventually(
		app.api.agents.births({}),
		(births) => births.some((born) => born.voyageId === VOYAGE && born.status !== "requested"),
		"the voyage's birth to leave requested",
	);
});

it.app("nothing Antumbra would start on its own goes out while everything is held", function* (app) {
	yield* knownModels(app.api, "claude", "opus");
	yield* app.api.settings.setFlag({ key: "holdEverything", on: true });
	yield* launched(app);
	yield* app.api.agents.hail({ by: "agent", requestId: HAIL, voyageId: VOYAGE });
	yield* wentOnElsewhere(app);
	const births = yield* answered(app.api.agents.births({}), "the births to be listed");
	expect(births.filter((born) => born.pieceId !== null)).toEqual([]);
	expect(births.filter((born) => born.source === "hail")).toMatchObject([{ status: "requested" }]);
});
