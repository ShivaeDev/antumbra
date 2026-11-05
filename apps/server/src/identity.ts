import { owner, roles } from "@antumbra/platform-access/policy.ts";
import { trustedOrigins } from "@shivaedev/identity/server/adapters/trustedOrigins.ts";
import { localOwner } from "@shivaedev/identity/server/localOwner.ts";
import { Effect, FileSystem, Option, Path, Redacted } from "effect";

export const identity = Effect.fn("Server.identity")(function* (directory: string, origins: readonly string[]) {
	const local = yield* localOwner({ owner, roles });
	const fs = yield* FileSystem.FileSystem;
	const path = yield* Path.Path;
	const file = path.join(directory, "runner-credential");
	const token = yield* Effect.gen(function* () {
		if (yield* fs.exists(file)) return yield* fs.readFileString(file);
		const machine = yield* local.machines.issue({ name: "Antumbra runner", scope: "runner" });
		const token = Redacted.value(machine.token);
		yield* fs.writeFileString(file, token, { mode: 0o600 });
		return token;
	});
	const machine = yield* local.machines.resolve(token);
	if (Option.isNone(machine)) return yield* Effect.die(new Error("The runner credential has been revoked"));
	return {
		...local,
		sessions: { ...local.sessions, origin: trustedOrigins({ allow: origins, missing: "allow", sameOrigin: {} }) },
		runnerToken: token,
	};
});
