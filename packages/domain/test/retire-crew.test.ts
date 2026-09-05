import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { endsTurn, it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { awaitRetirement, born, chartered, handFor, landed } from "#test/retire-crew-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

const SOUNDER = "agent-sounder";
const MATE = "agent-mate";
const ELSEWHERE = "agent-elsewhere";

const retiredAgents = Effect.gen(function* () {
	const db = yield* Database;
	const agents = yield* db.Agent.where({ status: "retired" }).all();
	return agents.map((agent) => agent.id).toSorted();
});

it.effectApp("retiring a piece's crew retires exactly the agents claimed to it", function* ({ scripted }) {
	const sight = yield* SightSource;
	const { pieceId, voyageId } = yield* chartered;
	const other = yield* chartered;
	const sounderSession = yield* born(handFor(SOUNDER, pieceId, voyageId));
	const mateSession = yield* born(handFor(MATE, pieceId, voyageId));
	const otherSession = yield* born(handFor(ELSEWHERE, other.pieceId, other.voyageId));
	yield* landed(pieceId);
	yield* endsTurn(scripted, sounderSession);
	yield* endsTurn(scripted, mateSession);
	yield* endsTurn(scripted, otherSession);

	yield* sight.retireCrew(pieceId);

	yield* awaitRetirement;
	expect(yield* retiredAgents).toEqual([MATE, SOUNDER].toSorted());
});

it.effectApp("retiring a piece's crew never retires the voyage captain", function* ({ scripted }) {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const sight = yield* SightSource;
	const { pieceId, voyageId } = yield* chartered;
	const captain = yield* domain.voyages.hail(voyageId);
	expect(yield* untilTerminal(kernel.changes(captain.intentId))).toBe("succeeded");
	const sounderSession = yield* born(handFor(SOUNDER, pieceId, voyageId));
	yield* landed(pieceId);
	const captainSession = Option.getOrThrow(yield* db.AgentSession.where({ agentId: captain.agentId, parentSessionId: null }).first());
	yield* endsTurn(scripted, captainSession.id);
	yield* endsTurn(scripted, sounderSession);

	yield* sight.retireCrew(pieceId);

	yield* awaitRetirement;
	expect(yield* retiredAgents).toEqual([SOUNDER]);
	const still = yield* db.Agent.where({ id: captain.agentId }).first();
	expect(Option.getOrThrow(still).status).toBe("alive");
});
