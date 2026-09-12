import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { PieceVerdict } from "@antumbra/platform-vocabulary/verdict.ts";
import { Voyages } from "@antumbra/voyages";
import { Clock, Effect, Layer, Option, Ref } from "effect";
import { assigningAgent } from "#assign-agent.ts";
import { PieceNotFound } from "#errors.ts";
import type { CharterInput, PieceRow } from "#model.ts";
import { type Chart, charteredRow, emptyChart, membersOf, patched, rewired, verdictsOf, wiredEdges } from "#scripted.ts";
import { Pieces } from "#service.ts";

export type ScriptedChart = Ref.Ref<Chart>;

export const scriptedChart = (): ScriptedChart => Ref.makeUnsafe<Chart>(emptyChart);

export const scriptedPiecesOn = (state: ScriptedChart) =>
	Layer.effect(Pieces)(
		Effect.gen(function* () {
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const sailing = yield* Voyages;
			const held = (pieceId: string) =>
				Effect.map(Ref.get(state), (chart) => Option.fromNullishOr(chart.pieces.find((piece) => piece.id === pieceId)));
			const standing = Effect.fnUntraced(function* (pieceId: string) {
				const piece = yield* held(pieceId);
				return Option.isNone(piece) ? yield* new PieceNotFound({ pieceId }) : piece.value;
			});
			const change = Effect.fnUntraced(function* (pieceId: string, patch: Partial<PieceRow>) {
				yield* standing(pieceId);
				yield* Ref.update(state, (chart) => patched(chart, pieceId, patch));
				yield* feeds.publishVoyageRefresh();
			});
			return {
				assignAgent: assigningAgent(db, feeds),
				byId: held,
				byVoyage: (voyageId: string) => Effect.map(Ref.get(state), (chart) => membersOf(chart, voyageId)),
				charter: Effect.fnUntraced(function* (input: CharterInput) {
					yield* sailing.verifyExists(input.voyageId);
					const chart = yield* Ref.get(state);
					const row = charteredRow(input, input.id ?? crypto.randomUUID());
					const edges = yield* wiredEdges(chart, row.id, input.dependsOn);
					yield* Ref.set(state, { edges: [...chart.edges, ...edges], pieces: [...chart.pieces, row] });
					yield* feeds.publishVoyageRefresh();
					return row;
				}),
				edges: (voyageId: string) =>
					Effect.map(Ref.get(state), (chart) => {
						const members = new Set(membersOf(chart, voyageId).map((piece) => piece.id));
						return chart.edges.filter((edge) => members.has(edge.toPieceId));
					}),
				landVerdict: Effect.fnUntraced(function* (pieceId: string, verdict: PieceVerdict) {
					const piece = yield* standing(pieceId);
					if (piece.verdict !== verdict) {
						yield* change(pieceId, { verdict });
					}
				}),
				launch: Effect.fnUntraced(function* (pieceId: string) {
					const piece = yield* standing(pieceId);
					if (piece.launchedAt === null) {
						yield* change(pieceId, { launchedAt: new Date(yield* Clock.currentTimeMillis) });
					}
				}),
				list: () => Effect.map(Ref.get(state), (chart) => chart.pieces),
				membersOfVoyage: (voyageId: string) =>
					Effect.map(Ref.get(state), (chart): ReadonlySet<string> => new Set(membersOf(chart, voyageId).map((piece) => piece.id))),
				park: Effect.fnUntraced(function* (pieceId: string, parked: boolean) {
					yield* change(pieceId, { parkedAt: parked ? new Date(yield* Clock.currentTimeMillis) : null });
				}),
				setDependencies: Effect.fnUntraced(function* (pieceId: string, dependsOn: ReadonlyArray<string>) {
					yield* standing(pieceId);
					const chart = yield* Ref.get(state);
					yield* Ref.set(state, rewired(chart, pieceId, yield* wiredEdges(chart, pieceId, dependsOn)));
					yield* feeds.publishVoyageRefresh();
				}),
				verdicts: (pieceIds: ReadonlyArray<string>) => Effect.map(Ref.get(state), (chart) => verdictsOf(chart, pieceIds)),
				verifyExists: Effect.fnUntraced(function* (pieceId: string) {
					yield* standing(pieceId);
				}),
			};
		}),
	);

export const scriptedPieces = Layer.unwrap(Effect.sync(() => scriptedPiecesOn(scriptedChart())));
