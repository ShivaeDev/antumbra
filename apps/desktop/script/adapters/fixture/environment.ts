import { Config, Effect } from "effect";

export const fixtureEnvironment = () =>
	Effect.runSync(
		Config.all({
			PATH: Config.String("PATH").pipe(Config.withDefault("")),
			ANTUMBRA_POSTGRES_BIN_DIRECTORY: Config.String("ANTUMBRA_POSTGRES_BIN_DIRECTORY").pipe(Config.withDefault("")),
		}),
	);
