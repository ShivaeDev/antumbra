import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";
import type { SessionTurnMark } from "#session-turn.ts";

// why: a turn ending leaves the same quiet mark as standing down. It says
// which of three things it met: an acquisition words have reached since the
// reading was taken, one nothing is holding any more, or the one the ending
// belongs to.
export const makeTurnEnded = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.turnEnded")((sessionId: string, mark: SessionTurnMark | undefined) => attachments.turnEnded(sessionId, mark));
