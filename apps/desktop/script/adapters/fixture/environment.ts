import { Config, Effect } from "effect";

export const fixtureEnvironment = (token: string) =>
	Effect.runSync(
		Config.all({
			PATH: Config.String("PATH").pipe(Config.withDefault("")),
			ANTUMBRA_POSTGRES_BIN_DIRECTORY: Config.String("ANTUMBRA_POSTGRES_BIN_DIRECTORY").pipe(Config.withDefault("")),
		}).pipe(Effect.map((binaries) => ({ ...binaries, ANTUMBRA_TOKEN: token }))),
	);
