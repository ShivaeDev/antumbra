import { join } from "node:path";
import { Context, Effect, FileSystem, Layer, Ref, Schema } from "effect";

const Identity = Schema.Struct({ port: Schema.Int, token: Schema.String, runnerId: Schema.String, logId: Schema.String });
export type ShellIdentity = typeof Identity.Type;
export class ShellState extends Context.Service<
	ShellState,
	{
		readonly identity: ShellIdentity;
		readonly rememberPort: (port: number) => Effect.Effect<void>;
	}
>()("@antumbra/desktop/ShellState") {}

export const ShellStateLayer = (directory: string) =>
	Layer.effect(ShellState)(
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = join(directory, "shell.json");
			const save = (identity: ShellIdentity) => fs.writeFileString(path, JSON.stringify(identity)).pipe(Effect.orDie);
			const exists = yield* fs.exists(path).pipe(Effect.orDie);
			const identity = exists
				? yield* fs.readFileString(path).pipe(Effect.orDie, Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Identity))), Effect.orDie)
				: { port: 0, token: crypto.randomUUID(), runnerId: crypto.randomUUID(), logId: crypto.randomUUID() };
			if (!exists) yield* save(identity);
			const selected = yield* Ref.make(identity.port);
			return {
				identity,
				rememberPort: (port: number) =>
					Effect.gen(function* () {
						if ((yield* Ref.get(selected)) === port) return;
						yield* save({ ...identity, port });
						yield* Ref.set(selected, port);
					}),
			};
		}),
	);
