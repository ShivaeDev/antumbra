import { Charter } from "@antumbra/domain-agents/ports/charter.ts";
import { type birth, bornAs } from "@antumbra/domain-agents/rows/birth.ts";
import { captainCharter } from "@antumbra/platform-prompts/charter-captain.ts";
import { crewCharter } from "@antumbra/platform-prompts/charter-crew.ts";
import { flagshipCharter } from "@antumbra/platform-prompts/charter-flagship.ts";
import { pieceSmootherWords, smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { pieceBoard, voyageBoard } from "@antumbra/platform-vocabulary/board-ids.ts";
import { Boards } from "@antumbra/server-boards/service.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Reclamation } from "@antumbra/server-reclamation/service.ts";
import { Repos } from "@antumbra/server-repos/service.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { Voyages } from "@antumbra/server-voyages/service.ts";
import { Effect, Layer, Option } from "effect";
import { pieceLines } from "#agents/pieces.ts";
import { rulingLine } from "#agents/rulings.ts";
import { material } from "#smoothing/material.ts";

type Birth = typeof birth.Row.Type;

const target = Effect.fn("Agents.smoothingTarget")(function* (sessionId: string) {
	const boardsService = yield* Boards;

	const bound = yield* boardsService.smoothingSessionFor({ sessionId }).pipe(Effect.orDie);
	if (bound === null) return yield* Effect.die(new Error(`the smoother session ${sessionId} has no bound smoothing target`));
	return bound;
});

export const constrainedPrompt = Effect.fn("Agents.constrainedPrompt")(function* (held: Birth) {
	if (held.role !== "smoother") return null;
	const bound = yield* target(held.sessionId);
	return bound.level === "day" ? smootherWords : pieceSmootherWords;
});

const smoothing = Effect.fn("Agents.smootherCharter")(function* (held: Birth) {
	const boardsService = yield* Boards;

	const bound = yield* target(held.sessionId);
	const board = yield* boardsService.entries({ board: bound.board }).pipe(Effect.orDie);
	const covered = board.filter((entry) => entry.seq >= bound.coversFrom && entry.seq <= bound.coversTo);
	return { text: yield* material({ ...bound, entries: covered }), constrainedPrompt: bound.level === "day" ? smootherWords : pieceSmootherWords };
});

const berthing = Effect.fn("Agents.berthing")(function* (agentId: string) {
	const reclamationService = yield* Reclamation;
	const reposService = yield* Repos;

	const moorage = yield* reclamationService.current({ agentId }).pipe(Effect.orDie);
	if (Option.isNone(moorage)) return { berths: [], moorageRoot: null };
	const moored = yield* reclamationService.berths({ agentId }).pipe(Effect.orDie);
	const registered = yield* reposService.all({}).pipe(Effect.orDie);
	const lines = [];
	for (const registration of registered) {
		const berth = moored.find((row) => row.source === registration.source && row.status !== "reclaimed" && row.status !== "stranded");
		if (berth === undefined) continue;
		lines.push({ branch: berth.branch, folder: berth.path, repo: registration.name });
	}
	return { berths: lines, moorageRoot: moorage.value.root };
});

const chartered = Effect.fn("Agents.charter")(function* (held: Birth) {
	const voyagesService = yield* Voyages;
	const piecesService = yield* Pieces;
	const rulingsService = yield* Rulings;
	const boardsService = yield* Boards;

	const voyage = held.voyageId === null ? null : yield* voyagesService.byId({ id: held.voyageId }).pipe(Effect.orDie);
	const piece = held.pieceId === null ? null : yield* piecesService.byId({ id: held.pieceId }).pipe(Effect.orDie);
	const subjects: Array<{ readonly kind: "agent" | "piece" | "voyage"; readonly id: string }> = [{ kind: "agent", id: held.agentId }];
	if (voyage !== null) subjects.push({ kind: "voyage", id: voyage.id });
	if (piece !== null) subjects.push({ kind: "piece", id: piece.id });
	const rulings = (yield* rulingsService.binding({ subjects }).pipe(Effect.orDie)).map(rulingLine);
	const voyageLog =
		voyage === null ? [] : (yield* boardsService.digest({ board: voyageBoard(voyage.id) }).pipe(Effect.orDie)).map((entry) => entry.body);
	const context = voyage?.context ?? "";
	const northStar = voyage?.northStar ?? "";
	const role = bornAs(held, voyage);
	const berthed = yield* berthing(held.agentId);
	if (role === "crew")
		return crewCharter({
			...berthed,
			context,
			northStar,
			voyageLog,
			rulings,
			expectation: piece?.expectation ?? "",
			pieceCharter: piece?.charter ?? "",
			pieceTitle: piece?.title ?? held.role,
			pieceLog: piece === null ? [] : (yield* boardsService.digest({ board: pieceBoard(piece.id) }).pipe(Effect.orDie)).map((entry) => entry.body),
		});
	const input = { ...berthed, context, northStar, voyageLog, rulings, pieceLines: voyage === null ? [] : yield* pieceLines(voyage.id) };
	return role === "flagship" ? flagshipCharter(input) : captainCharter(input);
});

const compose = Effect.fn("Agents.compose")(function* (held: Birth) {
	if (held.role === "smoother") return yield* smoothing(held);
	return { text: yield* chartered(held), constrainedPrompt: null };
});

export const charters = Layer.effect(
	Charter,
	Effect.gen(function* () {
		const context = yield* Effect.context<Effect.Services<ReturnType<typeof compose>>>();
		return { compose: (held: Birth) => compose(held).pipe(Effect.provideContext(context)) };
	}),
);
