import { port } from "@antumbra/platform-feature/port.ts";
import type * as Id from "@antumbra/platform-vocabulary/id.ts";
import type { Effect } from "effect";
import type { PieceId } from "#example/ids.ts";

export interface Muster {
	readonly chartered: number;
	readonly launched: number;
}

export interface Announcement {
	readonly pieceId: PieceId;
	readonly requestId: Id.Request;
}

export class Roster extends port<
	Roster,
	{
		readonly crew: Effect.Effect<readonly string[]>;
		readonly muster: (counts: Muster) => Effect.Effect<void>;
		readonly announce: (announcement: Announcement) => Effect.Effect<void>;
	}
>()("roster") {}
