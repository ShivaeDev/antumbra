import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

// why: the session's tools are bound to this agent, this session, and what it
// answers to. Capability effects are closed here, before the callbacks cross
// into the provider SDK.
export const makeSpawnTools = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	const compileCrewTools = yield* makeCrewToolCompiler;
	return (payload: SpawnFields): ReadonlyArray<DirectTool> => {
		const identity = spawnSessionIdentity(payload);
		return isVoyageCaptainIdentity(payload.role, identity)
			? compileCaptainTools(identity)
			: compileCrewTools(identity);
	};
});
