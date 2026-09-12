import { outcomeId } from "@antumbra/domain-pieces/ids.ts";
import { pieceOutcome } from "@antumbra/domain-pieces/rows/piece-outcome.ts";
import { heldResourceId } from "@antumbra/domain-reclamation/ids.ts";
import { berth } from "@antumbra/domain-reclamation/rows/berth.ts";
import { heldResource } from "@antumbra/domain-reclamation/rows/held-resource.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import type { ReadHandles, WriteHandles } from "@antumbra/platform-feature/handles.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { unresolvedChangeIds } from "#queries/outcome-status.ts";
import { change } from "#rows/change.ts";
import { changeVerdict } from "#rows/change-verdict.ts";
import { pieceChange } from "#rows/piece-change.ts";

const sources = [change, pieceChange, changeVerdict, repo, berth, pieceOutcome, heldResource] as const;
const targets = [pieceOutcome, heldResource] as const;
type Reads = ReadHandles<typeof sources>;
type Writes = WriteHandles<typeof targets>;
type World = { changes: readonly (typeof change.Row.Type)[]; links: readonly (typeof pieceChange.Row.Type)[]; dismissed: ReadonlySet<string> };
const desiredOutcomes = ({ changes, links, dismissed }: World) => {
	const lookup = new Map(changes.map((row) => [row.id, row]));
	const desired: Array<typeof pieceOutcome.Row.Type> = [];
	for (const pieceId of new Set(links.map((row) => row.pieceId))) {
		const pieceLinks = links.filter((row) => row.pieceId === pieceId);
		const pending = unresolvedChangeIds({ changes, pieceChanges: pieceLinks, dismissedChangeIds: dismissed });
		for (const link of pieceLinks) {
			const held = lookup.get(link.changeId);
			if (held !== undefined && (held.stage === "landed" || pending.has(held.id)))
				desired.push({
					id: outcomeId("change", held.id, pieceId),
					pieceId,
					sourceKind: "change",
					sourceId: held.id,
					status: held.stage === "landed" ? "landed" : "pending",
				});
		}
	}

	return desired;
};
const syncOutcomes = Effect.fn("changes.syncOutcomes")(function* (reads: Reads, writes: Writes, desired: readonly (typeof pieceOutcome.Row.Type)[]) {
	const wanted = new Map(desired.map((row) => [row.id, row]));
	for (const current of yield* reads.pieceOutcome.where({ sourceKind: "change" }))
		if (!wanted.has(current.id)) yield* writes.pieceOutcome.delete(current.id);
	for (const row of desired) {
		if (yield* reads.pieceOutcome.exists(row.id)) {
			const before = yield* reads.pieceOutcome.get(row.id);
			if (before.status !== row.status) yield* writes.pieceOutcome.update(row.id, row);
		} else yield* writes.pieceOutcome.insert(row);
	}
});
const syncHolds = Effect.fn("changes.syncHolds")(function* (reads: Reads, writes: Writes, { changes, links, dismissed }: World) {
	const unresolved = unresolvedChangeIds({ changes, pieceChanges: links, dismissedChangeIds: dismissed });
	const repositories = new Map((yield* reads.repo.where({})).map((row) => [row.id, row]));
	const holds: Array<typeof heldResource.Row.Type> = [];
	for (const resource of yield* reads.berth.where({}))
		for (const held of changes)
			if (unresolved.has(held.id) && repositories.get(held.repoId)?.source === resource.source && held.headRef === resource.branch)
				holds.push({ id: heldResourceId(resource.id, held.id), berthId: resource.id, changeId: held.id });
	const holdIds = new Set(holds.map((row) => row.id));
	for (const held of yield* reads.heldResource.where({})) if (!holdIds.has(held.id)) yield* writes.heldResource.delete(held.id);
	for (const held of holds) if (!(yield* reads.heldResource.exists(held.id))) yield* writes.heldResource.insert(held);
});
export const outcomes = projection("changeOutcomes", {
	reads: sources,
	writes: targets,
	run: Effect.fn("changes.outcomes")(function* (reads, writes) {
		const world = {
			changes: yield* reads.change.where({}),
			links: yield* reads.pieceChange.where({}),
			dismissed: new Set((yield* reads.changeVerdict.where({})).map((row) => row.changeId)),
		};
		yield* syncOutcomes(reads, writes, desiredOutcomes(world));
		yield* syncHolds(reads, writes, world);
	}),
});
