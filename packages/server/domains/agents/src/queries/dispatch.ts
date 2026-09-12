import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { sessionOperation } from "@antumbra/domain-sessions/rows/session-operation.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";
import { pieceAgent } from "#rows/piece-agent.ts";

const Target = Schema.Struct({ piece: piece.Row, voyage: voyage.Row, root: Schema.NullOr(session.Row) });

export const dispatch = query("dispatch", {
	input: {},
	output: Schema.Struct({ cancel: Schema.Array(birth.Row), ready: Schema.Array(Target) }),
	reads: [piece, pieceProgress, voyage, agent, pieceAgent, session, sessionOperation, birth, flag],
	run: Effect.fn("Agents.dispatch")(function* (_input, rows) {
		const pieces = yield* rows.piece.where({});
		const readings = yield* rows.pieceProgress.where({});
		const eligible = new Set(readings.filter((reading) => reading.eligible).map((reading) => reading.id));
		const births = yield* rows.birth.where({});
		const cancel = births.filter(
			(held) => held.source === "dispatch" && held.status === "requested" && held.pieceId !== null && !eligible.has(held.pieceId),
		);
		if ((yield* rows.flag.where({})).some((setting) => setting.on && (setting.key === "holdEverything" || setting.key === "holdPieceDispatch")))
			return { cancel, ready: [] };
		const voyages = new Map((yield* rows.voyage.where({})).map((voyage) => [voyage.id, voyage]));
		const agents = yield* rows.agent.where({});
		const links = yield* rows.pieceAgent.where({});
		const roots = yield* rows.session.where({ parentSessionId: null, status: "open" });
		const operations = yield* rows.sessionOperation.where({});
		const readyIds = new Set(readings.filter((reading) => reading.state === "ready").map((reading) => reading.id));
		const candidates = pieces
			.filter((piece) => readyIds.has(piece.id))
			.flatMap((piece): Array<typeof Target.Type> => {
				const voyage = voyages.get(piece.voyageId);
				if (voyage === undefined || births.some((held) => held.pieceId === piece.id && ["requested", "admitted", "waiting"].includes(held.status)))
					return [];
				const assigned = new Set(links.filter((link) => link.pieceId === piece.id).map((link) => link.agentId));
				const living = agents.filter((agent) => assigned.has(agent.id) && ["alive", "spawning"].includes(agent.status));
				if (living.length === 0) return [{ piece, voyage, root: null }];
				const assignedAgent = living.toSorted((a, b) => a.id.localeCompare(b.id))[0];
				const root = roots.find((root) => assignedAgent?.currentSessionId === root.id);
				if (
					root === undefined ||
					root.executionStatus !== "idle" ||
					operations.some(
						(operation) =>
							operation.sessionId === root.id &&
							(operation.status === "requested" || operation.status === "waiting" || operation.status === "ambiguous"),
					)
				)
					return [];
				return [{ piece, voyage, root }];
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
	}),
});
