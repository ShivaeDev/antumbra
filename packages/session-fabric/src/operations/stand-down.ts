import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeStandDown = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("SessionFabric.standDown")((sessionId: string) => attachments.standDown(sessionId));
