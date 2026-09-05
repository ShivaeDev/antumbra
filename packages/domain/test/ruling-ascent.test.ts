import { BoardScope, Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { isTerminalIntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { AgentDomain } from "#domain.ts";
import { type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { eventually, openReefVoyage } from "#test/voyage-fixtures.ts";

const ASKER = "agent-asker";

type Rung = "admiral" | "captain" | "flagship";

const openFlagship = Effect.gen(function* () {
	const db = yield* Database;
	const flagship = Option.getOrThrow(yield* db.Voyage.where({ kind: "flagship" }).first());
	yield* db.Voyage.where({ id: flagship.id }).update({ captainBackend: "scripted" });
	return flagship.id;
});

const hailCaptain = (scripted: ScriptedBackend, voyageId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const captain = yield* domain.voyages.hail(voyageId);
		const status = yield* kernel
			.changes(captain.intentId)
			.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));
		expect(status).toBe("succeeded");
		yield* sessionFor(scripted, captain.agentId);
		return captain.agentId;
	});

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

const ask = (question: string, rung: Rung, radius: "fleet" | "voyage" = "voyage", agentId: string = ASKER) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const requested = yield* rulings.request({
			choices: [{ detail: "and chart it again", label: "resurvey" }],
			context: "two voyages dredged each other's soundings",
			gates: [],
			question,
			radius,
			recommendation: { choice: "resurvey", reasoning: "both soundings are a season old" },
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

const crewFleet = Effect.fnUntraced(function* (scripted: ScriptedBackend) {
	const reefId = yield* crewReef;
	const flagshipId = yield* openFlagship;
	return {
		flagshipCaptain: yield* hailCaptain(scripted, flagshipId),
		reefCaptain: yield* hailCaptain(scripted, reefId),
	};
});

it.effectApp("a crew member's question reaches its own captain as one mail", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
	const rulingId = yield* ask("may a voyage dredge what it has not surveyed?", "captain");

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
			`${ASKER} would choose "resurvey": both soundings are a season old`,
			`Rule on it with rule_on, naming ruling ${rulingId}. If it is not yours to settle, pass_up carries it to the rung above with what you know.`,
		].join("\n"),
	);
	expect(yield* mailbox(fleet.flagshipCaptain)).toEqual([]);
});

it.effectApp("a captain's own question reaches the flagship", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
	const rulingId = yield* ask("may we dredge?", "flagship", "fleet", fleet.reefCaptain);

	const entries = yield* carried(fleet.flagshipCaptain, 1);
	expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
	expect(yield* mailbox(fleet.reefCaptain)).toEqual([]);
});

it.effectApp("a question a captain passes up climbs on the next pass", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
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
});

it.effectApp("a question the admiral holds is carried to nobody", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
	const climbing = yield* ask("may we dredge?", "flagship", "fleet");
	yield* ask("and who signs the survey?", "admiral", "fleet");

	const entries = yield* carried(fleet.flagshipCaptain, 1);
	expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${climbing}`);
	expect(yield* mailbox(fleet.reefCaptain)).toEqual([]);
});

it.effectApp("a later pass carries the next question and repeats no earlier one", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
	const feeds = yield* DomainFeeds;
	const first = yield* ask("may we dredge?", "captain");
	yield* carried(fleet.reefCaptain, 1);

	yield* feeds.publishRulingRefresh();
	const second = yield* ask("and who signs the survey?", "captain");

	const entries = yield* carried(fleet.reefCaptain, 2);
	expect(entries.map((entry) => entry.sourceRef)).toEqual([`ruling-ascent:${first}`, `ruling-ascent:${second}`]);
});

it.effectApp("a question asked before its rung is held climbs on the hail", { clock: "live" }, function* ({ scripted }) {
	const db = yield* Database;
	const reefId = yield* crewReef;

	const rulingId = yield* ask("which reading do we trust?", "captain");
	expect(yield* db.BoardEntry.all()).toEqual([]);

	const captain = yield* hailCaptain(scripted, reefId);

	const entries = yield* carried(captain, 1);
	expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${rulingId}`);
});

it.effectApp("a captain's question is never carried back to itself", { clock: "live" }, function* ({ scripted }) {
	const fleet = yield* crewFleet(scripted);
	yield* ask("what does the reef need next?", "captain", "voyage", fleet.reefCaptain);
	const asked = yield* ask("which reading do we trust?", "captain");

	const entries = yield* carried(fleet.reefCaptain, 1);
	expect(entries[0]?.sourceRef).toBe(`ruling-ascent:${asked}`);
});
