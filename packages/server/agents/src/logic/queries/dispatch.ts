import type * as Source from "@antumbra/domain-agents/queries/dispatch.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { allows, ungated } from "@antumbra/domain-settings/queries/flags.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as pieceSelection } from "@antumbra/server-storage/records/piece.ts";
import { selection as pieceAgentSelection } from "@antumbra/server-storage/records/piece-agent.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as sessionOperationSelection } from "@antumbra/server-storage/records/session-operation.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Schema } from "effect";

const Target = Schema.Struct({ piece: piece.Row, voyage: voyage.Row, root: Schema.NullOr(session.Row), held: Schema.Boolean });

export const dispatch = Effect.fn("Agents.dispatch")(function* (
	_input: Schema.Struct.Type<typeof Source.dispatch.input>,
): Effect.fn.Return<typeof Source.dispatch.output.Type, never, Records> {
	const rows = yield* Records;

	const pieces = yield* rows.piece
		.findMany({ where: {}, orderBy: { field: "chartered_order", direction: "asc" }, select: pieceSelection })
		.pipe(Effect.orDie);
	const readings = yield* rows.pieceProgress
		.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
		.pipe(Effect.orDie);
	const eligible = new Set(readings.filter((reading) => reading.eligible).map((reading) => reading.id));
	const births = yield* rows.birth
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	const cancel = births.filter(
		(held) => held.source === "dispatch" && held.status === "requested" && held.pieceId !== null && !eligible.has(held.pieceId),
	);
	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	const resuming = allows(flags, "resumePieces");
	const spawning = allows(flags, "spawnForPiece");
	const voyages = new Map(
		(yield* rows.voyage
			.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
			.pipe(Effect.orDie)).map((voyage) => [voyage.id, voyage]),
	);
	const agents = yield* rows.agent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie);
	const links = yield* rows.pieceAgent
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: pieceAgentSelection })
		.pipe(Effect.orDie);
	const roots = yield* rows.session
		.findMany({ where: { parentSessionId: null, status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const operations = yield* rows.sessionOperation
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: sessionOperationSelection })
		.pipe(Effect.orDie);
	const readyIds = new Set(readings.filter((reading) => reading.state === "ready").map((reading) => reading.id));
	const candidates = pieces
		.filter((piece) => readyIds.has(piece.id))
		.flatMap((piece): Array<typeof Target.Type> => {
			const voyage = voyages.get(piece.voyageId);
			if (voyage === undefined || births.some((held) => held.pieceId === piece.id && ["requested", "admitted", "waiting"].includes(held.status)))
				return [];
			const quieted = voyage.quietedAt !== null;
			const assigned = new Set(links.filter((link) => link.pieceId === piece.id).map((link) => link.agentId));
			const living = agents.filter((agent) => assigned.has(agent.id) && ["alive", "spawning"].includes(agent.status));
			if (living.length === 0) return [{ piece, voyage, root: null, held: quieted || !spawning }];
			const assignedAgent = living.toSorted((a, b) => a.id.localeCompare(b.id))[0];
			const root = roots.find((root) => assignedAgent?.currentSessionId === root.id);
			if (root !== undefined && root.stoppedAt !== null) return [];
			if (
				root === undefined ||
				root.executionStatus !== "idle" ||
				operations.some(
					(operation) =>
						operation.sessionId === root.id &&
						(operation.status === "requested" || operation.status === "waiting" || operation.status === "ambiguous") &&
						ungated(flags, operation.gatedBy),
				)
			)
				return [];
			return [{ piece, voyage, root, held: quieted || !resuming }];
		});
	return {
		cancel,
		ready: candidates.toSorted(
			(a, b) =>
				(b.voyage.focusedAt ?? "").localeCompare(a.voyage.focusedAt ?? "") ||
				(a.piece.launchedAt ?? "").localeCompare(b.piece.launchedAt ?? "") ||
				a.piece.id.localeCompare(b.piece.id),
		),
	};
});
