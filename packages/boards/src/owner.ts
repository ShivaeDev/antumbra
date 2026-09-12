import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { BoardOwnerNotFound } from "#errors.ts";

const ownerOf = (agentId: string) => ({ ownerId: agentId, ownerKind: "agent" as const });

export const requireMailbox = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (!(yield* db.Agent.where({ id: agentId }).exists())) {
			return yield* new BoardOwnerNotFound(ownerOf(agentId));
		}
	});

export const linkedMailbox = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.BoardOwner.where(ownerOf(agentId))
			.select("boardId")
			.first()
			.pipe(Effect.map((link) => Option.map(link, (row) => row.boardId)));
	});

export const openMailbox = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requireMailbox(agentId);
		const linked = yield* linkedMailbox(agentId);
		if (Option.isSome(linked)) {
			return linked.value;
		}
		const boardId = crypto.randomUUID();
		yield* db.Board.create({ id: boardId });
		yield* db.BoardOwner.create({ boardId, ...ownerOf(agentId) });
		return boardId;
	});
