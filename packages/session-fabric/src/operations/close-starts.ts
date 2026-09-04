import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";

export const makeCloseStarts = (admission: SessionFabricState["startAdmission"]) => Effect.fn("SessionFabric.closeStarts")(() => admission.close);
