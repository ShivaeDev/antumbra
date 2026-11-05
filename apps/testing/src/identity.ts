import { owner, roles } from "@antumbra/platform-access/policy.ts";
import { SessionPolicy } from "@shivaedev/identity/server/SessionPolicy.ts";
import { Effect, Layer, Option } from "effect";

export const sessions = Layer.effect(
	SessionPolicy,
	Effect.map(roles.resolve("owner"), (access) => ({
		origin: () => true,
		provider: { get: () => Effect.succeed(Option.some({ user: { ...owner, ...access } })) },
	})),
).pipe(Layer.orDie);
