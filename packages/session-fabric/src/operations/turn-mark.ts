import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeTurnMark = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("SessionFabric.turnMark")((sessionId: string) => attachments.turnMark(sessionId));
