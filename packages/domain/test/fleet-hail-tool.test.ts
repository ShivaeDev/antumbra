import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { flagshipCaptain } from "#test/flagship-fixtures.ts";
import { callTool } from "#test/harness.ts";
import { aliveAgent, openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

it.effectApp("the flagship's captain hails a voyage's captain", function* ({ scripted }) {
	const { captain } = yield* flagshipCaptain(scripted);
	const db = yield* Database;
	const procedures = yield* VoyageProcedureService;
	const reef = yield* openReefVoyage;

	const first = yield* callTool(captain, "hail_captain", {
		voyageId: reef.id,
	});

	expect(first.ok).toBe(true);
	const [, agentId = "", spawnIntentId = ""] = /^hailed captain (\S+) of voyage (?:\S+) — intent (\S+)$/.exec(first.text) ?? [];
	expect(first.text).toBe(`hailed captain ${agentId} of voyage ${reef.id} — intent ${spawnIntentId}`);
	expect(Option.getOrThrow(yield* db.Intent.where({ id: spawnIntentId }).first()).tag).toBe("agent/spawn");
	expect(yield* terminalIntent(spawnIntentId)).toBe("succeeded");
	yield* aliveAgent(agentId);
	const view = Option.getOrThrow(yield* procedures.read(reef.id));
	expect(Option.getOrThrow(view.captain)).toMatchObject({
		agentId,
		status: "alive",
	});
});
