import { it } from "@antumbra/app-testing/entry.ts";
import { FLEET } from "@antumbra/domain-role-settings/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { readFleet } from "#tools/voyages/fleet.ts";

const voyageId = VoyageId.make("reef");

const context = { agentId: "flagship", sessionId: "root", callId: "fleet" };

it.app("reads back what every role resolves to and where each value came from", function* (app) {
	yield* app.api.backends.listModels({
		backend: "claude",
		failure: null,
		models: [{ defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "opus", name: "Opus" }],
	});
	yield* app.api.roleSettings.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: FLEET });
	yield* app.api.voyages.open({
		name: "Reef",
		northStar: "Charted",
		context: "Uncharted",
		kind: "voyage",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
		requestId: Request.make(voyageId),
	});

	const answer = yield* readFleet.invoke(context, {});

	expect(answer.ok).toBe(true);
	expect(answer.text).toContain(
		`- ${voyageId} Reef [quiet] · voyage · captain on claude (fleet default) with opus (backend default) at high effort (backend default) · crew on claude (backend default) with opus (backend default) at high effort (backend default) ·`,
	);
	expect(answer.text).toContain("- captain on claude with opus (backend default) at high effort (backend default)");
	expect(answer.text).toContain("- crew on claude (backend default) with opus (backend default) at high effort (backend default)");
});
