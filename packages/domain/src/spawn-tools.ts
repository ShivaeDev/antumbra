import type { AgentBackend, DirectTool } from "@antumbra/plugin-api";
import { isVoyageCaptainIdentity } from "@antumbra/voyages/authority/captain";
import { VoyageAuthority } from "@antumbra/voyages/authority/service";
import { Effect } from "effect";
import { makeCaptainToolCompiler } from "#captain-tools.ts";
import { makeCrewToolCompiler } from "#crew-tools.ts";
import { makeFleetToolCompiler } from "#fleet-tools.ts";
import type { SpawnFields } from "#spawn-fields.ts";
import { spawnSessionIdentity } from "#spawn-identity.ts";
import type { SessionIdentity } from "#tool-identity.ts";

// Capability effects close before their callbacks cross into a provider SDK.
export const makeAgentToolCompiler = (backends: ReadonlyMap<string, AgentBackend>) =>
	Effect.gen(function* () {
		const compileCaptainTools = yield* makeCaptainToolCompiler;
		const compileCrewTools = yield* makeCrewToolCompiler;
		const compileFleetTools = yield* makeFleetToolCompiler(backends);
		const authority = yield* VoyageAuthority;
		return (role: string, identity: SessionIdentity): Effect.Effect<ReadonlyArray<DirectTool>> =>
			isVoyageCaptainIdentity(role, identity)
				? authority.isFlagshipCaptain(role, identity).pipe(
						Effect.orElseSucceed(() => false),
						Effect.map((flagship) => (flagship ? compileFleetTools(identity) : compileCaptainTools(identity))),
					)
				: Effect.succeed(compileCrewTools(identity));
	});

export const makeSpawnTools = (backends: ReadonlyMap<string, AgentBackend>) =>
	Effect.map(makeAgentToolCompiler(backends), (compile) => (payload: SpawnFields) => compile(payload.role, spawnSessionIdentity(payload)));
