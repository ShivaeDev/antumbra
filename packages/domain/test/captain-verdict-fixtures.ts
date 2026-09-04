import { BoardScope, Boards } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { type Context, Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { eventually, openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";

export const ASKER = "agent-asker";
export const FLAGSHIP_ID = "voyage-flagship";

export interface Ladder {
	readonly captain: ScriptedSession;
	readonly captainAgentId: string;
	readonly flagship: ScriptedSession;
	readonly voyageId: string;
}

type LadderNeeds =
	| AgentDomain
	| Context.Service.Identifier<typeof Boards>
	| Context.Service.Identifier<typeof Database>
	| Context.Service.Identifier<typeof Rulings>;

const seedAsker = (voyageId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "sound the shallows",
			id: ASKER,
			role: "hand",
			status: "alive",
		});
		yield* db.VoyageAgent.create({ agentId: ASKER, role: "hand", voyageId });
		yield* boards.ensure(BoardScope.Agent({ agentId: ASKER }));
	});

const openFlagship = Effect.gen(function* () {
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

export const ask = (radius: "fleet" | "voyage", rung: "captain" | "flagship") =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.request({
			choices: [{ label: "resurvey" }, { label: "trust the chart" }],
			context: "two voyages dredged each other's soundings",
			gates: [],
			question: "may a voyage dredge what it has not surveyed?",
			radius,
			requester: { agentId: ASKER, kind: "agent" },
			rung,
			subjects: [],
			urgency: "pressing",
		});
	});

const hailed = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const captain = yield* domain.voyages.hail(voyageId);
		expect(yield* terminalIntent(captain.intentId)).toBe("succeeded");
		return {
			agentId: captain.agentId,
			session: yield* sessionFor(scripted, captain.agentId),
		};
	});

export const withLadder = <A, E>(body: (ladder: Ladder) => Effect.Effect<A, E, LadderNeeds>) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const voyage = yield* openReefVoyage;
			yield* seedAsker(voyage.id);
			yield* openFlagship;
			const captain = yield* hailed(scripted, voyage.id);
			const flagship = yield* hailed(scripted, FLAGSHIP_ID);
			yield* body({
				captain: captain.session,
				captainAgentId: captain.agentId,
				flagship: flagship.session,
				voyageId: voyage.id,
			});
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

export const standing = (rulingId: string) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		return yield* rulings.get(rulingId);
	});

export const unruled = (ruling: Ruling) => Option.isNone(ruling.answer);

export const delivered = (rulingId: string) =>
	eventually(
		Effect.gen(function* () {
			const boards = yield* Boards;
			const entries = yield* boards.read(BoardScope.Agent({ agentId: ASKER }));
			expect(entries.map((entry) => entry.sourceRef)).toContain(`ruling:${rulingId}`);
			return entries;
		}),
	);
