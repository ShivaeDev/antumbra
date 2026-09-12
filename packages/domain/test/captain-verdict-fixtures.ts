import { Mail } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { type ScriptedBackend, type ScriptedSession, sessionFor } from "#test/harness.ts";
import { eventually, flagshipVoyage, openReefVoyage, terminalIntent } from "#test/voyage-fixtures.ts";
import { VoyageProcedureService } from "#voyages/service.ts";

export const ASKER = "agent-asker";

export interface Ladder {
	readonly captain: ScriptedSession;
	readonly captainAgentId: string;
	readonly flagship: ScriptedSession;
	readonly voyageId: string;
}

const seedAsker = (voyageId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.Agent.create({
			charter: "sound the shallows",
			id: ASKER,
			role: "hand",
			status: "alive",
		});
		yield* db.VoyageAgent.create({ agentId: ASKER, role: "hand", voyageId });
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
		const procedures = yield* VoyageProcedureService;
		const captain = yield* procedures.hail(voyageId);
		expect(yield* terminalIntent(captain.intentId)).toBe("succeeded");
		return {
			agentId: captain.agentId,
			session: yield* sessionFor(scripted, captain.agentId),
		};
	});

export const crewLadder = Effect.fnUntraced(function* (scripted: ScriptedBackend) {
	const voyage = yield* openReefVoyage;
	yield* seedAsker(voyage.id);
	const flagshipId = (yield* flagshipVoyage).id;
	const captain = yield* hailed(scripted, voyage.id);
	const flagship = yield* hailed(scripted, flagshipId);
	return {
		captain: captain.session,
		captainAgentId: captain.agentId,
		flagship: flagship.session,
		voyageId: voyage.id,
	};
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
			const mail = yield* Mail;
			const entries = yield* mail.mailbox(ASKER);
			expect(entries.map((held) => held.id)).toContain(`ruling:${rulingId}`);
			return entries;
		}),
	);
