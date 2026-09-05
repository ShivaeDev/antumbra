import { changeOutcomeTallies } from "@antumbra/changes";
import type { RetirementWorld } from "#voyage-rows.ts";

interface OutcomeTally {
	readonly landed: number;
	readonly pending: number;
}

export const pieceOutcomeTallies = (world: RetirementWorld): ReadonlyMap<string, OutcomeTally> => {
	if (world.pieces.length === 0) return new Map();
	const changes = changeOutcomeTallies(world);
	const reports = Map.groupBy(world.pieceReports, (link) => link.pieceId);
	const artifacts = Map.groupBy(world.artifacts.values(), (artifact) => artifact.pieceId);
	return new Map(
		world.pieces.map((piece) => {
			const change = changes.get(piece.id);
			return [
				piece.id,
				{
					landed:
						(reports.get(piece.id)?.length ?? 0) +
						(artifacts.get(piece.id)?.length ?? 0) +
						(change?.landed ?? 0) +
						Number(world.pieceVerdicts.has(piece.id)),
					pending: change?.pending ?? 0,
				},
			];
		}),
	);
};
