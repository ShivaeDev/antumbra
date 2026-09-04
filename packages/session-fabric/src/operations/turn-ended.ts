import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";
import type { SessionTurnMark } from "#session-turn.ts";

export const makeTurnEnded = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("SessionFabric.turnEnded")((sessionId: string, mark: SessionTurnMark | undefined) => attachments.turnEnded(sessionId, mark));
