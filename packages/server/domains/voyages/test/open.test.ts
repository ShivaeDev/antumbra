import { roleSettingId } from "@antumbra/domain-role-settings/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { FLAGSHIP_REQUEST, VoyageId } from "#ids.ts";
import { answered, it, opening } from "#test/kit.ts";

const REEF_REQUEST = Id.Request.make("voyage:reef");

const reef = VoyageId.make(REEF_REQUEST);

const seated = (role: "captain" | "crew", backend: string, model: string, effort: string) => ({
	backend,
	effort,
	id: roleSettingId(reef, role),
	model,
	role,
	scope: reef,
});

it.app("opening a voyage stores it with the captain and the crew seated, and a later choice moves only the role it names", function* (app) {
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
