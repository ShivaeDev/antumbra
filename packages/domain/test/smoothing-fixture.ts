import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Reports } from "@antumbra/reports";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import type { ScriptedBackend } from "#test/harness.ts";
import { laterBy } from "#test/session-idle-fixture.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

export const DAY_MILLIS = 24 * 60 * 60 * 1000;

export const HAND = "agent-hand";

const passFor = (tag: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const demand = domain.intentDemands.find((registration) => registration.tag === tag);
		return demand === undefined ? yield* Effect.die(`no ${tag} demand is registered`) : demand.pass;
	});

export const dailyPass = Effect.flatten(passFor("board/smooth"));

export const piecePass = Effect.flatten(passFor("board/smooth-piece"));

export const passedADayLater = Effect.flatMap(passFor("board/smooth"), (pass) => laterBy(DAY_MILLIS, pass));

export const smoothIntents = (tag: string, subject: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.Intent.where({ tag })
			.orderBy((intent) => intent.createdAt.asc())
			.all();
		return rows.filter((row) => row.payload.includes(JSON.stringify(subject)));
	});

export const noteOn = (scope: BoardScope, body: string) =>
	Effect.gen(function* () {
		const boards = yield* Boards;
		yield* boards.write(scope, EntryInput.Note({ authorAgentId: Option.some(HAND), body, register: "rough" }));
	});

export const reefWithHand = Effect.gen(function* () {
	const db = yield* Database;
	const voyage = yield* openReefVoyage;
	yield* db.Agent.create({ charter: "chart the reef", id: HAND, role: "crew", status: "alive" });
	return voyage;
});

export const soundings = (voyageId: string) =>
	Effect.gen(function* () {
		const pieces = yield* Pieces;
		return yield* pieces.charter({
			charter: "sound the northern shoals",
			dependsOn: [],
			expectation: "the depths are recorded",
			role: "hand",
			title: "soundings",
			voyageId,
		});
	});

export const landed = (pieceId: string) =>
	Effect.gen(function* () {
		const reports = yield* Reports;
		yield* reports.land({ body: "the depths are recorded", pieceId, title: "soundings" });
	});

export const finishedPiece = (voyageId: string) =>
	Effect.gen(function* () {
		const piece = yield* soundings(voyageId);
		yield* noteOn(BoardScope.Piece({ pieceId: piece.id }), "the northern shoal is steeper than charted");
		yield* landed(piece.id);
		return piece;
	});

export const smootherAtWork = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const { input, sessionId } = yield* scripted.queued;
		const session = yield* scripted.session(sessionId);
		return {
			material: input.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n"),
			session: Option.getOrThrow(Option.fromUndefinedOr(session)),
		};
	});
