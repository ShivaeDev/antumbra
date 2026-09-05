import type { ChangeRow, PieceChangeRow } from "@antumbra/changes";
import type { MembershipRow, PieceRow, RepoRow } from "#voyage-rows.ts";

export interface QuayRecords {
	readonly changes: ReadonlyArray<ChangeRow>;
	readonly dismissedChangeIds: ReadonlySet<string>;
	readonly pieceChanges: ReadonlyArray<PieceChangeRow>;
	readonly memberships: ReadonlyArray<MembershipRow>;
	readonly pieces: ReadonlyArray<PieceRow>;
	readonly repos: ReadonlyMap<string, RepoRow>;
	readonly sessions: ReadonlyArray<{ readonly id: string; readonly agentId: string }>;
	readonly voyages: ReadonlyArray<{ readonly id: string; readonly name: string }>;
}
