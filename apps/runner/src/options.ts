import { Config, Effect, Schema } from "effect";

const Options = Schema.Struct({
	directory: Schema.NonEmptyString,
	assets: Schema.optional(Schema.NonEmptyString),
	url: Schema.NonEmptyString,
	token: Schema.NonEmptyString,
	runnerId: Schema.NonEmptyString,
	logId: Schema.NonEmptyString,
});
export type Options = typeof Options.Type;
const argument = (argv: ReadonlyArray<string>, flag: string): string | undefined => {
	const at = argv.indexOf(flag);
	return at < 0 ? undefined : argv[at + 1];
};
export const options = (argv: ReadonlyArray<string>) =>
	Effect.flatMap(Config.string("ANTUMBRA_TOKEN"), (token) =>
		Schema.decodeUnknownEffect(Options)({
			directory: argument(argv, "--data"),
			assets: argument(argv, "--assets"),
			url: argument(argv, "--server"),
			runnerId: argument(argv, "--runner-id"),
			logId: argument(argv, "--log-id"),
			token,
		}),
	);
