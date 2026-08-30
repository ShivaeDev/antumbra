import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeHolds = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.holds")((sessionId: string) => attachments.holds(sessionId));
