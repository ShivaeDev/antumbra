import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { flagshipVoyage, terminalIntent } from "#test/voyage-fixtures.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const hailedCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const procedures = yield* VoyageProcedureService;
		const hailed = yield* procedures.hail(voyageId);
		expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
		return yield* sessionFor(scripted, hailed.agentId);
	});

export const toolNames = (session: ScriptedSession): ReadonlyArray<string> => session.tools.map((tool) => tool.name);

export const flagshipCaptain = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const flagship = yield* flagshipVoyage;
		return { captain: yield* hailedCaptain(scripted, flagship.id), voyageId: flagship.id };
	});
