import type { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import type { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { PieceHistory } from "@antumbra/server-journal/postgres/pieces/service.ts";
import { VoyageHistory } from "@antumbra/server-journal/postgres/voyages/service.ts";
import { Effect } from "effect";

export const all = Effect.fn("Pieces.all")(function* () {
	return yield* (yield* PieceHistory).all();
});
export const byId = Effect.fn("Pieces.byId")(function* ({ id }: { readonly id: PieceId }) {
	return yield* (yield* PieceHistory).byId(id);
});
export const progress = Effect.fn("Pieces.progress")(function* ({ id }: { readonly id: PieceId }) {
	return yield* (yield* PieceHistory).progress(id);
});
export const byVoyage = Effect.fn("Pieces.byVoyage")(function* ({ voyageId }: { readonly voyageId: VoyageId }) {
	return (yield* all()).filter((piece) => piece.voyageId === voyageId);
});
export const others = Effect.fn("Pieces.others")(function* (input: { readonly id: PieceId; readonly voyageId: VoyageId }) {
	return (yield* byVoyage(input)).filter((piece) => piece.id !== input.id);
});
export const reach = Effect.fn("Pieces.reach")(function* (input: { readonly voyageId: VoyageId; readonly pieceIds: readonly string[] }) {
	const members = new Set<string>((yield* byVoyage(input)).map((piece) => piece.id));
	return input.pieceIds.filter((id) => !members.has(id));
});
export const edges = Effect.fn("Pieces.edges")(function* (input: { readonly voyageId: VoyageId }) {
	const members = new Set((yield* byVoyage(input)).map((piece) => piece.id));
	return (yield* (yield* PieceHistory).edges()).filter((edge) => members.has(edge.to));
});
export const dependencies = Effect.fn("Pieces.dependencies")(function* ({ id }: { readonly id: PieceId }) {
	const history = yield* PieceHistory;
	const pieces = yield* all();
	const incoming = (yield* history.edges()).filter((edge) => edge.to === id).toSorted((a, b) => a.from.localeCompare(b.from));
	return incoming.flatMap((edge) => pieces.filter((piece) => piece.id === edge.from).map((piece) => ({ id: piece.id, title: piece.title })));
});
const order = { active: 0, ready: 1, blocked: 2, landing: 3, held: 4, parked: 5, done: 6, abandoned: 7 };
export const displayByVoyage = Effect.fn("Pieces.displayByVoyage")(function* (input: { readonly voyageId: VoyageId }) {
	const history = yield* PieceHistory;
	const displayed = [];
	for (const piece of yield* byVoyage(input)) {
		const progress = yield* history.progress(piece.id);
		if (progress !== null) displayed.push({ ...piece, state: progress.state });
	}
	return displayed.toSorted((a, b) => order[a.state] - order[b.state] || a.title.localeCompare(b.title));
});
export const ready = Effect.fn("Pieces.ready")(function* () {
	const history = yield* PieceHistory;
	const voyages = yield* VoyageHistory;
	const candidates = [];
	for (const piece of yield* all()) {
		const progress = yield* history.progress(piece.id);
		if (progress?.state !== "ready") continue;
		const voyage = yield* voyages.byId(piece.voyageId);
		if (voyage !== null) candidates.push({ piece, voyage });
	}
	return candidates.toSorted(
		(a, b) =>
			Number(b.voyage.focusedAt !== null) - Number(a.voyage.focusedAt !== null) ||
			(a.piece.launchedAt ?? "").localeCompare(b.piece.launchedAt ?? "") ||
			a.piece.id.localeCompare(b.piece.id),
	);
});
