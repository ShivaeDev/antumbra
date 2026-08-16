import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import { Effect, Option } from "effect";

// why: a Board owner is discriminated because entity ids may overlap across
// kinds; the pair is the durable address while boardId is globally exclusive.
export type BoardScope =
	| { readonly agentId: string; readonly kind: "agent" }
	| { readonly kind: "piece"; readonly pieceId: string }
	| { readonly kind: "voyage"; readonly voyageId: string };

export interface BoardOwner {
	readonly ownerId: string;
	readonly ownerKind: BoardScope["kind"];
}

export const ownerOf = (scope: BoardScope): BoardOwner => {
	if (scope.kind === "agent") {
		return { ownerId: scope.agentId, ownerKind: "agent" };
	}
	if (scope.kind === "piece") {
		return { ownerId: scope.pieceId, ownerKind: "piece" };
	}
	return { ownerId: scope.voyageId, ownerKind: "voyage" };
};

const boardIdOf = (link: Option.Option<{ readonly boardId: string }>) =>
	Option.map(link, (row) => row.boardId);

export const linkedBoardId = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<Option.Option<string>, PrismaError, WriteExecutors> => {
	const owner = ownerOf(scope);
	return db.BoardOwner.where(owner).first().pipe(Effect.map(boardIdOf));
};

export const linkBoard = (
	db: DatabaseService,
	scope: BoardScope,
	boardId: string,
): Effect.Effect<void, PrismaError, WriteExecutors> => {
	return db.BoardOwner.create({ boardId, ...ownerOf(scope) }).pipe(
		Effect.asVoid,
	);
};
