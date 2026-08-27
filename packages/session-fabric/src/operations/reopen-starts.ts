import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeReopenStarts = (
	admission: SessionFabricState["startAdmission"],
) => Effect.fn("sessionFabric.reopenStarts")(() => admission.reopen);
