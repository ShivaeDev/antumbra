import { Effect } from "effect";
import type { SessionFabricState } from "#session-fabric-state.ts";
import { type SessionStartPermit, sessionStartPermit } from "#session-start-permit.ts";

export const makeWithStartAdmission = (admission: SessionFabricState["startAdmission"]) =>
	Effect.fn("SessionFabric.withStartAdmission")(
		<Success, Failure, Requirements>(
			use: (permit: SessionStartPermit) => Effect.Effect<Success, Failure, Requirements>,
		): Effect.Effect<Success, Failure, Requirements> => admission.run(Effect.suspend(() => use(sessionStartPermit))),
	);
