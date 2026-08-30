import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeTurnMark = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.turnMark")((sessionId: string) => attachments.turnMark(sessionId));
