import { Charter } from "@antumbra/domain-agents/ports/charter.ts";
import { type birth, bornAs } from "@antumbra/domain-agents/rows/birth.ts";
import { pieceBoard, voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { digest } from "@antumbra/domain-boards/queries/digest.ts";
import { entries } from "@antumbra/domain-boards/queries/entries.ts";
import { smoothingSessionFor } from "@antumbra/domain-boards/queries/smoothing-session-for.ts";
import { byId as pieceById } from "@antumbra/domain-pieces/queries/by-id.ts";
import { berths } from "@antumbra/domain-reclamation/queries/berths.ts";
import { current } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import { binding } from "@antumbra/domain-rulings/queries/binding.ts";
import { byId as voyageById } from "@antumbra/domain-voyages/queries/by-id.ts";
import type { Berthing } from "@antumbra/platform-prompts/charter-berths.ts";
import { captainCharter } from "@antumbra/platform-prompts/charter-captain.ts";
import { crewCharter } from "@antumbra/platform-prompts/charter-crew.ts";
import { flagshipCharter } from "@antumbra/platform-prompts/charter-flagship.ts";
import { pieceSmootherWords, smootherWords } from "@antumbra/platform-prompts/smoother.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect, Layer, Option } from "effect";
import { pieceLines } from "#agents/pieces.ts";
import { rulingLine } from "#agents/rulings.ts";
import { material } from "#smoothing/material.ts";

type Birth = typeof birth.Row.Type;

const target = Effect.fn("Agents.smoothingTarget")(function* (sessionId: string) {
	const live = yield* Live;
	const bound = yield* live.read(smoothingSessionFor, { sessionId });
	if (bound === null) return yield* Effect.die(new Error(`the smoother session ${sessionId} has no bound smoothing target`));
	return bound;
});

export const constrainedPrompt = Effect.fn("Agents.constrainedPrompt")(function* (held: Birth) {
	if (held.role !== "smoother") return null;
	const bound = yield* target(held.sessionId);
	return bound.level === "day" ? smootherWords : pieceSmootherWords;
});

const smoothing = Effect.fn("Agents.smootherCharter")(function* (held: Birth) {
	const live = yield* Live;
	const bound = yield* target(held.sessionId);
	const board = yield* live.read(entries, { board: bound.board });
	const covered = board.filter((entry) => entry.seq >= bound.coversFrom && entry.seq <= bound.coversTo);
	return { text: yield* material({ ...bound, entries: covered }), constrainedPrompt: bound.level === "day" ? smootherWords : pieceSmootherWords };
});

const berthing = Effect.fn("Agents.berthing")(function* (agentId: string): Effect.fn.Return<Berthing, never, Live> {
	const live = yield* Live;
	const moorage = yield* live.read(current, { agentId });
	if (Option.isNone(moorage)) return { berths: [], moorageRoot: "" };
	const moored = yield* live.read(berths, { agentId });
	const registered = yield* live.read(repos, {});
	const lines = [];
	for (const registration of registered) {
		const berth = moored.find((row) => row.source === registration.source);
		if (berth === undefined) continue;
		lines.push({ branch: berth.branch, folder: berth.path, repo: registration.name });
	}
	return { berths: lines, moorageRoot: moorage.value.root };
});

const chartered = Effect.fn("Agents.charter")(function* (held: Birth) {
	const live = yield* Live;
	const voyage = held.voyageId === null ? null : yield* live.read(voyageById, { id: held.voyageId });
	const piece = held.pieceId === null ? null : yield* live.read(pieceById, { id: held.pieceId });
	const subjects: Array<{ readonly kind: "agent" | "piece" | "voyage"; readonly id: string }> = [{ kind: "agent", id: held.agentId }];
	if (voyage !== null) subjects.push({ kind: "voyage", id: voyage.id });
	if (piece !== null) subjects.push({ kind: "piece", id: piece.id });
	const rulings = (yield* live.read(binding, { subjects })).map(rulingLine);
	const voyageLog = voyage === null ? [] : (yield* live.read(digest, { board: voyageBoard(voyage.id) })).map((entry) => entry.body);
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
			pieceLog: piece === null ? [] : (yield* live.read(digest, { board: pieceBoard(piece.id) })).map((entry) => entry.body),
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
		const live = yield* Live;
		return { compose: (held: Birth) => compose(held).pipe(Effect.provideService(Live, live)) };
	}),
);
