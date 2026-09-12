import type { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Effect } from "effect";
import { EdgeWouldCycle, PieceNotFound } from "#errors.ts";
import type { CharterInput, EdgeRow, PieceRow } from "#model.ts";

export interface Chart {
	readonly edges: readonly EdgeRow[];
	readonly pieces: readonly PieceRow[];
}

export const emptyChart: Chart = { edges: [], pieces: [] };

export const charteredRow = (input: CharterInput, pieceId: string): PieceRow => ({
	charter: input.charter,
	expectation: input.expectation,
	id: pieceId,
	launchedAt: null,
	parkedAt: null,
	role: input.role,
	title: input.title,
	verdict: null,
	voyageId: input.voyageId,
});

const downstreamOf = (edges: readonly EdgeRow[], pieceId: string): ReadonlySet<string> => {
	const onward = Map.groupBy(edges, (edge) => edge.fromPieceId);
	const reached = new Set<string>();
	const frontier = [pieceId];
	while (frontier.length > 0) {
		const at = frontier.pop();
		if (at === undefined || reached.has(at)) {
			continue;
		}
		reached.add(at);
		for (const edge of onward.get(at) ?? []) {
			frontier.push(edge.toPieceId);
		}
	}
	return reached;
};

export const wiredEdges = Effect.fnUntraced(function* (chart: Chart, pieceId: string, dependsOn: ReadonlyArray<string>) {
	const known = new Set(chart.pieces.map((piece) => piece.id));
	const downstream = downstreamOf(chart.edges, pieceId);
	const wired: EdgeRow[] = [];
	for (const dependency of dependsOn) {
		if (!known.has(dependency)) {
			return yield* new PieceNotFound({ pieceId: dependency });
		}
		if (downstream.has(dependency)) {
			return yield* new EdgeWouldCycle({ fromPieceId: dependency, toPieceId: pieceId });
		}
		wired.push({ fromPieceId: dependency, toPieceId: pieceId });
	}
	return wired;
});

export const rewired = (chart: Chart, pieceId: string, edges: ReadonlyArray<EdgeRow>): Chart => ({
	edges: [...chart.edges.filter((edge) => edge.toPieceId !== pieceId), ...edges],
	pieces: chart.pieces,
});

export const patched = (chart: Chart, pieceId: string, change: Partial<PieceRow>): Chart => ({
	edges: chart.edges,
	pieces: chart.pieces.map((piece) => (piece.id === pieceId ? { ...piece, ...change } : piece)),
});

export const membersOf = (chart: Chart, voyageId: string): ReadonlyArray<PieceRow> => chart.pieces.filter((piece) => piece.voyageId === voyageId);

export const verdictsOf = (chart: Chart, pieceIds: ReadonlyArray<string>): ReadonlyMap<string, PieceVerdict> => {
	const wanted = new Set(pieceIds);
	const landed = new Map<string, PieceVerdict>();
	for (const piece of chart.pieces) {
		if (piece.verdict !== null && wanted.has(piece.id)) {
			landed.set(piece.id, piece.verdict);
		}
	}
	return landed;
};
