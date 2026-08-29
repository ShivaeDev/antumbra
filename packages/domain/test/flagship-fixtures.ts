import { Database } from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
	type ScriptedSession,
	sessionFor,
} from "#test/harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

export const FLAGSHIP_ID = "voyage-flagship";

export const openFlagship = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Voyage.create({
		backend: "scripted",
		context: "Fleet-level rulings and findings belong here.",
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
		return yield* eventually(sessionFor(scripted, hailed.agentId));
	});

export const toolNames = (session: ScriptedSession): ReadonlyArray<string> =>
	session.tools.map((tool) => tool.name);

// why: every fleet-tool rehearsal starts from the same place — a flagship
// with its captain at the tools — so the harness is one fixture and each test
// is only the act it rehearses.
export const withFlagshipCaptain = <A, E>(
	body: (
		captain: ScriptedSession,
	) => Effect.Effect<
		A,
		E,
		AgentDomain | Context.Service.Identifier<typeof Database>
	>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* openFlagship;
			yield* body(yield* hailedCaptain(scripted, FLAGSHIP_ID));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});
