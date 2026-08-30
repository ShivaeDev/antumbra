import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeInterrupt = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.interrupt")((sessionId: string) => attachments.interrupt(sessionId));
