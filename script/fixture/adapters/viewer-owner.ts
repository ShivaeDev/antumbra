import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { Data, Effect, Schema } from "effect";
import { lock } from "proper-lockfile";

export class FixtureViewerError extends Data.TaggedError("FixtureViewerError")<{ readonly cause: unknown }> {}

export const Viewer = Schema.Struct({ url: Schema.String, token: Schema.String });
const Status = Schema.Struct({ token: Schema.String, failure: Schema.NullOr(Schema.String) });
const attempt = <A>(body: () => Promise<A>) => Effect.tryPromise({ try: body, catch: (cause) => new FixtureViewerError({ cause }) });
const missing = (cause: unknown, code: string): boolean => cause instanceof Error && "code" in cause && cause.code === code;
export const descriptor = (root: string) => join(root, ".fixtures", "viewer.json");

const withOwnership = <A, E, R>(root: string, name: string, body: Effect.Effect<A, E, R>) =>
	Effect.gen(function* () {
		yield* attempt(() => mkdir(join(root, ".fixtures"), { recursive: true }));
		yield* Effect.acquireRelease(
			attempt(() => lock(join(root, ".fixtures", name), { realpath: false })),
			(release) => Effect.promise(() => release()),
		);
		return yield* body;
	}).pipe(Effect.scoped);

export const withViewerOwnership = <A, E, R>(root: string, body: Effect.Effect<A, E, R>) => withOwnership(root, "viewer.json", body);
export const withCheckOwnership = <A, E, R>(root: string, body: Effect.Effect<A, E, R>) => withOwnership(root, "check", body);

export const currentViewer = Effect.fnUntraced(function* (root: string) {
	const contents = yield* attempt(() => readFile(descriptor(root), "utf8")).pipe(
		Effect.catchIf(
			(error) => missing(error.cause, "ENOENT"),
			() => Effect.succeed(undefined),
		),
	);
	if (contents === undefined) return undefined;
	const viewer = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Viewer))(contents).pipe(
		Effect.mapError((cause) => new FixtureViewerError({ cause })),
	);
	const url = yield* Effect.try({ try: () => new URL(viewer.url), catch: (cause) => new FixtureViewerError({ cause }) });
	if (url.protocol !== "http:" || url.hostname !== "127.0.0.1") {
		return yield* Effect.fail(new FixtureViewerError({ cause: "Fixture viewer descriptor must use loopback HTTP." }));
	}
	const response = yield* attempt(() =>
		fetch(new URL("/__fixture/status", url), { headers: { Authorization: `Bearer ${viewer.token}` }, signal: AbortSignal.timeout(5000) }),
	).pipe(
		Effect.catchIf(
			(error) => error.cause instanceof Error && missing(error.cause.cause, "ECONNREFUSED"),
			() => Effect.succeed(undefined),
		),
	);
	if (response === undefined || response.status === 401 || response.status === 403 || response.status === 404) return undefined;
	if (!response.ok) return yield* Effect.fail(new FixtureViewerError({ cause: `Fixture status returned HTTP ${response.status}.` }));
	const status = yield* attempt(() => response.json()).pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Status)),
		Effect.mapError((cause) => new FixtureViewerError({ cause })),
	);
	if (status.token !== viewer.token) return undefined;
	return { ...viewer, failure: status.failure };
});

export const stopViewer = (checkoutRoot: string) =>
	Effect.gen(function* () {
		const viewer = yield* currentViewer(checkoutRoot);
		if (viewer) {
			const response = yield* attempt(() =>
				fetch(new URL("/__fixture/stop", viewer.url), {
					method: "POST",
					headers: { Authorization: `Bearer ${viewer.token}` },
					signal: AbortSignal.timeout(120000),
				}),
			);
			if (!response.ok) return yield* Effect.fail(new FixtureViewerError({ cause: `Fixture stop returned HTTP ${response.status}.` }));
		}
		yield* attempt(() => rm(descriptor(checkoutRoot), { force: true }));
	});
