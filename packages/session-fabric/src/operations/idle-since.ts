import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeIdleSince = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("sessionFabric.idleSince")((): Effect.Effect<ReadonlyMap<string, number>> => attachments.idleSince);
