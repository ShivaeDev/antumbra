import type { DirectTool } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import { makeFleetToolCompiler } from "#fleet-tools.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { isFlagshipCaptainIdentity, isVoyageCaptainIdentity } from "#voyage-captain.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

// Capability effects close before their callbacks cross into a provider SDK.
export const makeAgentToolCompiler = Effect.gen(function* () {
	const compileCaptainTools = yield* makeCaptainToolCompiler;
	const compileCrewTools = yield* makeCrewToolCompiler;
	const compileFleetTools = yield* makeFleetToolCompiler;
	const world = yield* VoyageWorldSource;
	return (role: string, identity: SessionIdentity): Effect.Effect<ReadonlyArray<DirectTool>> =>
		isVoyageCaptainIdentity(role, identity)
			? world.read.pipe(
					Effect.map((read) => isFlagshipCaptainIdentity(read, role, identity)),
					Effect.orElseSucceed(() => false),
					Effect.map((flagship) => (flagship ? compileFleetTools(identity) : compileCaptainTools(identity))),
				)
			: Effect.succeed(compileCrewTools(identity));
});

export const makeSpawnTools = Effect.map(
	makeAgentToolCompiler,
	(compile) => (payload: SpawnFields) => compile(payload.role, spawnSessionIdentity(payload)),
);
