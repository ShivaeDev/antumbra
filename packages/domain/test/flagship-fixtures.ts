import type { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { type Context, Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { terminalIntent } from "#test/voyage-fixtures.ts";

export const FLAGSHIP_ID = "voyage-flagship";

export const openFlagship = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Voyage.create({
		captainBackend: "scripted",
		context: "Fleet-level rulings and findings belong here.",
		crewBackend: "scripted",
		focusedAt: null,
		id: FLAGSHIP_ID,
		kind: "flagship",
		name: "Flagship",
		northStar: "The fleet sails well.",
	});
});

export const hailedCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const hailed = yield* domain.voyages.hail(voyageId);
		expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
		return yield* sessionFor(scripted, hailed.agentId);
	});

export const toolNames = (session: ScriptedSession): ReadonlyArray<string> => session.tools.map((tool) => tool.name);

export const withFlagshipCaptain = <A, E>(
	body: (captain: ScriptedSession) => Effect.Effect<A, E, AgentDomain | Context.Service.Identifier<typeof Database> | Kernel>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* openFlagship;
			yield* body(yield* hailedCaptain(scripted, FLAGSHIP_ID));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});
