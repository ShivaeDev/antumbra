import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeAttached = (attachments: SessionFabricState["attachments"]) =>
	Effect.fn("SessionFabric.attached")((): Effect.Effect<ReadonlySet<string>> => attachments.attached);
