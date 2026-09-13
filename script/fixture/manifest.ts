import { Data, Effect, Schema } from "effect";

export class FixtureError extends Data.TaggedError("FixtureError")<{ readonly message: string }> {}

export const Manifest = Schema.Struct({
	formatVersion: Schema.Literal(1),
	id: Schema.Int,
	label: Schema.String,
	source: Schema.Literals(["dev", "prod"]),
	captureStartedAt: Schema.String,
	captureCompletedAt: Schema.String,
	producer: Schema.NullOr(Schema.String),
	runnerLogs: Schema.Array(Schema.Struct({ path: Schema.String, seed: Schema.String })),
	files: Schema.Array(Schema.Struct({ path: Schema.String, bytes: Schema.Int, sha256: Schema.String })),
});
export type Manifest = typeof Manifest.Type;

export const fixtureIO = <A>(run: () => Promise<A>) =>
	Effect.tryPromise({ try: run, catch: (cause) => new FixtureError({ message: cause instanceof Error ? cause.message : String(cause) }) });
