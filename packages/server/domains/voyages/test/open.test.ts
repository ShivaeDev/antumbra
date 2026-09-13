import { answered, it } from "@antumbra/app-testing/entry.ts";
import { roleSettingId } from "@antumbra/domain-role-settings/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { FLAGSHIP_REQUEST, VoyageId } from "#ids.ts";
import { opening } from "#test/kit.ts";

const REEF_REQUEST = Id.Request.make("voyage:reef");

const reef = VoyageId.make(REEF_REQUEST);

const seated = (role: "captain" | "crew", backend: string, model: string, effort: string) => ({
	backend,
	effort,
	id: roleSettingId(reef, role),
	model,
	resolved: {
		backend: { source: "chosen", value: backend },
		effort: { source: "chosen", value: effort },
		model: { source: "chosen", value: model },
	},
	role,
	scope: reef,
});

it.app("seats both roles and changes only the chosen role", function* (app) {
	yield* app.api.voyages.open({
		...opening,
		captainBackend: "claude",
		captainEffort: "high",
		captainModel: "opus",
		crewBackend: "codex",
		crewEffort: "medium",
		crewModel: "gpt-5",
		requestId: REEF_REQUEST,
	});

	expect(yield* answered(app.api.voyages.byId({ id: reef }))).toMatchObject({
		context: "the reef is uncharted",
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	expect(yield* answered(app.api.roleSettings.forVoyage({ voyageId: reef }))).toEqual([
		seated("captain", "claude", "opus", "high"),
		seated("crew", "codex", "gpt-5", "medium"),
	]);

	yield* app.api.roleSettings.choose({ backend: "codex", effort: "medium", model: "gpt-5-codex", role: "crew", scope: reef });

	expect(yield* answered(app.api.roleSettings.forVoyage({ voyageId: reef }))).toEqual([
		seated("captain", "claude", "opus", "high"),
		seated("crew", "codex", "gpt-5-codex", "medium"),
	]);
});

it.app("rejects a blank name without creating a voyage", function* (app) {
	const voyages = yield* app.rows.voyage.count({});
	const roleSettings = yield* app.rows.roleSetting.count({});
	const refused = yield* Effect.flip(app.api.voyages.open({ ...opening, name: "   " }));

	expect(refused).toMatchObject({ _tag: "Blank", field: "name", message: "A voyage needs a name" });
	expect(yield* app.rows.voyage.count({})).toBe(voyages);
	expect(yield* app.rows.roleSetting.count({})).toBe(roleSettings);
});

it.app("deduplicates the flagship request", function* (app) {
	const first = yield* app.api.voyages.open({ ...opening, kind: "flagship", requestId: FLAGSHIP_REQUEST });
	const again = yield* app.api.voyages.open({ ...opening, kind: "flagship", requestId: FLAGSHIP_REQUEST });

	expect(again).toBe(first);
	expect(yield* app.rows.voyage.count({})).toBe(1);
});
