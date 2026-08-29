import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { type Context, Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

const ASKER = "agent-asker";
const FLAGSHIP_ID = "voyage-flagship";

type Rung = "admiral" | "captain" | "flagship";

interface Fleet {
	readonly flagshipCaptain: string;
	readonly reefCaptain: string;
	readonly scripted: ScriptedBackend;
}

type FleetNeeds =
	| AgentDomain
	| Context.Service.Identifier<typeof Boards>
	| Context.Service.Identifier<typeof Database>
	| Context.Service.Identifier<typeof DomainFeeds>
	| Context.Service.Identifier<typeof Rulings>;

const openFlagship = Effect.gen(function* () {
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

const hailCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const captain = yield* domain.voyages.hail(voyageId);
		yield* eventually(sessionFor(scripted, captain.agentId));
		return captain.agentId;
	});

// why: the reef voyage is crewed before anything is asked, because the rung a
// crew member waits on is read off its crew row rather than off the question.
const crewReef = Effect.gen(function* () {
	const db = yield* Database;
	const voyage = yield* openReefVoyage;
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: ASKER,
		role: "hand",
		status: "alive",
	});
	yield* db.VoyageAgent.create({
		agentId: ASKER,
		role: "hand",
		voyageId: voyage.id,
	});
	return voyage.id;
});

const ask = (
	question: string,
	rung: Rung,
	radius: "fleet" | "voyage" = "voyage",
	agentId: string = ASKER,
) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({
			choices: [{ detail: "and chart it again", label: "resurvey" }],
			context: "two voyages dredged each other's soundings",
			gates: [],
			question,
			radius,
			requester: { agentId, kind: "agent" },
			rung,
			subjects: [],
			urgency: "pressing",
		});
		return requested.id;
	});

const mailbox = (agentId: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		return yield* boards.read(BoardScope.Agent({ agentId }));
	});

const carried = (agentId: string, count: number) =>
	eventually(
		Effect.gen(function* () {
			const entries = yield* mailbox(agentId);
			expect(entries).toHaveLength(count);
			return entries;
		}),
	);

const withFleet = <A, E>(
	body: (fleet: Fleet) => Effect.Effect<A, E, FleetNeeds>,
) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const reefId = yield* crewReef;
			yield* openFlagship;
			yield* body({
				flagshipCaptain: yield* hailCaptain(scripted, FLAGSHIP_ID),
				reefCaptain: yield* hailCaptain(scripted, reefId),
				scripted,
			});
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	});

it.live("a crew member's question reaches its own captain as one mail", () =>
	withFleet((fleet) =>
		Effect.gen(function* () {
			const rulingId = yield* ask(
				"may a voyage dredge what it has not surveyed?",
				"captain",
			);

			const entries = yield* carried(fleet.reefCaptain, 1);
			expect(entries[0]).toMatchObject({
				authorAgentId: null,
				kind: "mail",
				precedence: "priority",
				sourceRef: `ruling-ascent:${rulingId}`,
			});
			expect(entries[0]?.body).toBe(
				[
					`${ASKER} asks for a ruling that would bind one voyage — the asker works on; what the ruling gates waits.`,
					"Question: may a voyage dredge what it has not surveyed?",
					"Context: two voyages dredged each other's soundings",
					"Choices offered:",
					"- resurvey — and chart it again",
					`Rule on it with rule_on, naming ruling ${rulingId}. If it is not yours to settle, pass_up carries it to the rung above with what you know.`,
				].join("\n"),
			);
			expect(yield* mailbox(fleet.flagshipCaptain)).toEqual([]);
		}),
	),
);

it.live("a captain's own question reaches the flagship", () =>
	withFleet((fleet) =>
		Effect.gen(function* () {
			const rulingId = yield* ask(
				"may we dredge?",
				"flagship",
				"fleet",
				fleet.reefCaptain,
			);

			const entries = yield* carried(fleet.flagshipCaptain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
			expect(yield* mailbox(fleet.reefCaptain)).toEqual([]);
		}),
	),
);

// why: the rung is the whole of what the ascent reads, so a question that
// climbs is owed to its new rung on the very next pass without anything having
// to remember it was already carried once.
it.live("a question a captain passes up climbs on the next pass", () =>
	withFleet((fleet) =>
		Effect.gen(function* () {
			const rulings = yield* Rulings;
			const rulingId = yield* ask("which reading do we trust?", "captain");
			yield* carried(fleet.reefCaptain, 1);

			yield* rulings.passUp({
				by: "captain",
				byAgentId: fleet.reefCaptain,
				note: "the other ship charts the same reef",
				rulingId,
			});

			const entries = yield* carried(fleet.flagshipCaptain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
		}),
	),
);

it.live("a question the admiral holds is carried to nobody", () =>
	withFleet((fleet) =>
		Effect.gen(function* () {
			const climbing = yield* ask("may we dredge?", "flagship", "fleet");
			yield* ask("and who signs the survey?", "admiral", "fleet");

			const entries = yield* carried(fleet.flagshipCaptain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${climbing}`);
			expect(yield* mailbox(fleet.reefCaptain)).toEqual([]);
		}),
	),
);

it.live(
	"a later pass carries the next question and repeats no earlier one",
	() =>
		withFleet((fleet) =>
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const first = yield* ask("may we dredge?", "captain");
				yield* carried(fleet.reefCaptain, 1);

				// why: a bare ring makes the observer walk the record again with
				// nothing new in it, so the second question proves the pass ran and the
				// single entry per ruling proves the first was not carried twice.
				yield* feeds.publishRulingRefresh();
				const second = yield* ask("and who signs the survey?", "captain");

				const entries = yield* carried(fleet.reefCaptain, 2);
				expect(entries.map((entry) => entry.sourceRef)).toEqual([
					`ruling-ascent:${first}`,
					`ruling-ascent:${second}`,
				]);
			}),
		),
);

// why: nothing rings the ruling feed between the question and the hail, so the
// mail arriving proves the hail itself woke the ascent — not a later write that
// happened to walk the record again.
it.live("a question asked before its rung is held climbs on the hail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const reefId = yield* crewReef;

			const rulingId = yield* ask("which reading do we trust?", "captain");
			expect(yield* db.BoardEntry.all()).toEqual([]);

			const captain = yield* hailCaptain(scripted, reefId);

			const entries = yield* carried(captain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("a captain's question is never carried back to itself", () =>
	withFleet((fleet) =>
		Effect.gen(function* () {
			yield* ask(
				"what does the reef need next?",
				"captain",
				"voyage",
				fleet.reefCaptain,
			);
			const asked = yield* ask("which reading do we trust?", "captain");

			const entries = yield* carried(fleet.reefCaptain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${asked}`);
		}),
	),
);
