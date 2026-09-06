import { Config, Effect, Schema } from "effect";

const DATA = "--data";

const Options = Schema.Struct({ directory: Schema.NonEmptyString, token: Schema.NonEmptyString });

export type Options = typeof Options.Type;

const argument = (argv: readonly string[], flag: string): string | undefined => {
	const at = argv.indexOf(flag);
	return at < 0 ? undefined : argv[at + 1];
};

export const options = (argv: readonly string[]): Effect.Effect<Options, Config.ConfigError | Schema.SchemaError> =>
	Effect.flatMap(Config.string("ANTUMBRA_TOKEN"), (token) => Schema.decodeUnknownEffect(Options)({ directory: argument(argv, DATA), token }));
