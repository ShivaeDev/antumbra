import { isVoyageCaptainIdentity } from "@antumbra/voyages/authority/captain";
import { VoyageAuthority } from "@antumbra/voyages/authority/service";
import { Effect } from "effect";
import { compileCaptainTools } from "#captain-tools.ts";
import { compileCrewTools } from "#crew-tools.ts";
import { compileFleetTools } from "#fleet-tools.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export const compile = (backends: ReadonlyArray<string>) =>
	Effect.fn("AgentToolCompiler.compile")(function* (role: string, identity: SessionIdentity) {
		if (!isVoyageCaptainIdentity(role, identity)) {
			return yield* compileCrewTools(identity);
		}
		const authority = yield* VoyageAuthority;
		const flagship = yield* authority.isFlagshipCaptain(role, identity).pipe(Effect.orElseSucceed(() => false));
		return yield* flagship ? compileFleetTools(identity, backends) : compileCaptainTools(identity);
	});
