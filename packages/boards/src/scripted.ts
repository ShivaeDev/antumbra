import { Option } from "effect";
import { type AppendFields, type BoardEntryRow, type BoardOwner, BoardScope, type EntryInput } from "#model.ts";

export type Log = ReadonlyMap<string, ReadonlyArray<BoardEntryRow>>;

export const emptyLog: Log = new Map();

export const boardKey = (scope: BoardScope): string =>
	BoardScope.$match(scope, {
		Agent: ({ agentId }) => `agent:${agentId}`,
		Piece: ({ pieceId }) => `piece:${pieceId}`,
		Voyage: ({ voyageId }) => `voyage:${voyageId}`,
	});

export const ownerOf = (scope: BoardScope): BoardOwner =>
	BoardScope.$match(scope, {
		Agent: ({ agentId }) => ({ ownerId: agentId, ownerKind: "agent" as const }),
		Piece: ({ pieceId }) => ({ ownerId: pieceId, ownerKind: "piece" as const }),
		Voyage: ({ voyageId }) => ({ ownerId: voyageId, ownerKind: "voyage" as const }),
	});

export const entriesOn = (log: Log, scope: BoardScope): ReadonlyArray<BoardEntryRow> => log.get(boardKey(scope)) ?? [];

export const appended = (log: Log, scope: BoardScope, row: BoardEntryRow): Log => new Map(log).set(boardKey(scope), [...entriesOn(log, scope), row]);

export const writtenRow = (input: EntryInput, fields: AppendFields): BoardEntryRow => {
	const shared = {
		authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
		body: input.body,
		createdAt: new Date(fields.nowMillis),
		id: input.id ?? crypto.randomUUID(),
		seq: fields.seq,
	};
	if (input._tag === "Note") {
		return { ...shared, kind: "note", register: input.register };
	}
	if (input._tag === "PieceSummary") {
		return { ...shared, kind: "pieceSummary", pieceId: input.pieceId, register: "rough" };
	}
	return { ...shared, coversFrom: input.coversFrom, coversTo: input.coversTo, kind: "summary", level: input.level, register: "smooth" };
};
