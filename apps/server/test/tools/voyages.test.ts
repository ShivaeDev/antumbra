import { it } from "@antumbra/app-testing/entry.ts";
import { FLEET } from "@antumbra/domain-role-settings/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "vitest";
import { readFleet } from "#tools/voyages/fleet.ts";

const voyageId = VoyageId.make("reef");

const context: ToolContext = { agentId: "flagship", sessionId: "root", callId: "fleet" };

it.app("reads back what every role resolves to, where each value came from, and what is still open", function* (app) {
	const roles = app.api.roleSettings;
	yield* app.api.backends.listModels({
		backend: "claude",
		failure: null,
		models: [{ defaultEffort: "high", efforts: ["low", "high"], isDefault: true, model: "opus", name: "Opus" }],
	});
	yield* app.api.backends.listModels({
		backend: "codex",
		failure: null,
		models: [{ defaultEffort: null, efforts: ["medium"], isDefault: true, model: "gpt-5", name: "GPT-5" }],
	});
	yield* roles.choose({ backend: "claude", effort: null, model: null, role: "captain", scope: FLEET });
	yield* roles.choose({ backend: "codex", effort: null, model: null, role: "flagship", scope: FLEET });
	yield* roles.choose({ backend: "codex", effort: "medium", model: "gpt-5", role: "smoother", scope: FLEET });
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
	yield* roles.choose({ backend: "opencode", effort: null, model: null, role: "crew", scope: voyageId });

	const answer = yield* readFleet.invoke(context, {});

	expect(answer.ok).toBe(true);
	expect(answer.text).toContain(
		`- ${voyageId} Reef [quiet] · voyage · captain on claude (fleet default) with opus (backend default) at high effort (backend default) · crew on opencode, model: waiting for the backend to list its models, effort: backend decides ·`,
	);
	expect(answer.text).toContain("- flagship on codex with gpt-5 (backend default), effort: backend decides");
	expect(answer.text).toContain("- captain on claude with opus (backend default) at high effort (backend default)");
	expect(answer.text).toContain("- crew on claude (backend default) with opus (backend default) at high effort (backend default)");
	expect(answer.text).toContain("- smoother on codex with gpt-5 at medium effort");
});
