import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AgentDomain } from "#domain.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import {
	acquireTemporaryPersistence,
	makeScriptedBackend,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import { eventually } from "#test/voyage-fixtures.ts";

const ASKER = "agent-asker";
const FLAGSHIP_ID = "voyage-flagship";

const seedAsker = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the shallows",
		id: ASKER,
		role: "hand",
		status: "alive",
	});
});

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

const hailFlagshipCaptain = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const hailed = yield* domain.voyages.hail(FLAGSHIP_ID);
		yield* eventually(sessionFor(scripted, hailed.agentId));
		return hailed.agentId;
	});

const ask = (
	question: string,
	radius: "fleet" | "voyage",
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

it.live("a fleet request reaches the flagship captain as one mail", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* seedAsker;
			yield* openFlagship;
			const captain = yield* hailFlagshipCaptain(scripted);

			const rulingId = yield* ask(
				"may a voyage dredge what it has not surveyed?",
				"fleet",
			);

			const entries = yield* carried(captain, 1);
			expect(entries[0]).toMatchObject({
				authorAgentId: null,
				kind: "mail",
				precedence: "priority",
				sourceRef: `ruling-ascent:${rulingId}`,
			});
			expect(entries[0]?.body).toBe(
				[
					`${ASKER} asks for a ruling that would bind the whole fleet — the asker works on; what the ruling gates waits.`,
					"Question: may a voyage dredge what it has not surveyed?",
					"Context: two voyages dredged each other's soundings",
					"Choices offered:",
					"- resurvey — and chart it again",
					`Rule on it with rule_on, naming ruling ${rulingId}. If it is not yours to settle, add what you know and leave it open for the admiral.`,
				].join("\n"),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live(
	"a later pass carries the next request and repeats no earlier one",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				yield* seedAsker;
				yield* openFlagship;
				const captain = yield* hailFlagshipCaptain(scripted);
				const first = yield* ask("may we dredge?", "fleet");
				yield* carried(captain, 1);

				// why: a bare ring makes the observer walk the record again with
				// nothing new in it, so the second request proves the pass ran and the
				// single entry per ruling proves the first was not carried twice.
				yield* feeds.publishRulingRefresh();
				const second = yield* ask("and who signs the survey?", "fleet");

				const entries = yield* carried(captain, 2);
				expect(entries.map((entry) => entry.sourceRef)).toEqual([
					`ruling-ascent:${first}`,
					`ruling-ascent:${second}`,
				]);
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);

it.live("a request that binds one voyage does not climb to the flagship", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* seedAsker;
			yield* openFlagship;
			const captain = yield* hailFlagshipCaptain(scripted);

			yield* ask("which reading do we trust?", "voyage");
			const fleetAsk = yield* ask("may we dredge?", "fleet");

			const entries = yield* carried(captain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${fleetAsk}`);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

// why: nothing rings the ruling feed between the request and the hail, so the
// mail arriving proves the hail itself woke the ascent — not a later write that
// happened to walk the record again.
it.live(
	"a request asked before the flagship is captained climbs on the hail",
	() =>
		Effect.gen(function* () {
			const temporary = yield* acquireTemporaryPersistence;
			const scripted = yield* makeScriptedBackend;
			yield* Effect.gen(function* () {
				const db = yield* Database;
				yield* seedAsker;
				yield* openFlagship;

				const rulingId = yield* ask("may we dredge?", "fleet");
				expect(yield* db.BoardEntry.all()).toEqual([]);

				const captain = yield* hailFlagshipCaptain(scripted);

				const entries = yield* carried(captain, 1);
				expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
			}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		}),
);

it.live("the flagship captain's own request does not climb back to it", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* seedAsker;
			yield* openFlagship;
			const captain = yield* hailFlagshipCaptain(scripted);

			yield* ask("what does the fleet dredge next?", "fleet", captain);
			const asked = yield* ask("may we dredge?", "fleet");

			const entries = yield* carried(captain, 1);
			expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${asked}`);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
