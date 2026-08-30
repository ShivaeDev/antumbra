import type { ChangeHostCapability } from "@antumbra/plugin-api";
import { Clock, Effect, Option, Ref } from "effect";
import { runGh } from "#command.ts";
import type { GhError } from "#errors.ts";
import { onThisMachine } from "#runtime.ts";

const AUTH_TIMEOUT_MILLIS = 15_000;

// why: a watcher asks whether it may talk to GitHub on every pass, and the
// answer changes about as often as a login does. One minute keeps a busy loop
// from spawning gh continuously without hiding a fresh `gh auth login` for
// longer than someone would wait before wondering why.
const CACHE_MILLIS = 60_000;

export interface CachedCapability {
	readonly forget: Effect.Effect<void>;
	readonly read: Effect.Effect<ChangeHostCapability>;
}

interface Held {
	readonly at: number;
	readonly value: ChangeHostCapability;
}

const loginLine = (stdout: string): string => {
	const line = stdout
		.split("\n")
		.map((text) => text.trim().replace(/^[✓✗•-]\s*/, ""))
		.find((text) => text.startsWith("Logged in"));
	return line === undefined || line === "" ? "authenticated" : line;
};

// why: "we could not start gh" is the one unavailability worth naming in our
// own words, because gh is not there to phrase it — every other detail comes
// from the tool itself.
const missingBinary = (failure: GhError): boolean => {
	const detail = failure.detail.toLowerCase();
	return failure._tag === "GhUnavailable" && (detail.includes("notfound") || detail.includes("not found") || detail.includes("enoent"));
};

// why: the tool's own words are handed on verbatim — gh already tells a reader
// how to fix a missing login, and paraphrasing it would only make the remedy
// less accurate than the version the machine actually has installed.
const refusal = (failure: GhError): ChangeHostCapability =>
	missingBinary(failure) ? { available: false, detail: "gh CLI not found" } : { available: false, detail: failure.detail };

const probe = (executable: string): Effect.Effect<ChangeHostCapability> =>
	onThisMachine(
		runGh({
			args: ["auth", "status", "--hostname", "github.com"],
			executable,
			operation: "auth-status",
			timeoutMillis: AUTH_TIMEOUT_MILLIS,
		}),
	).pipe(
		Effect.map(
			(stdout): ChangeHostCapability => ({
				available: true,
				detail: loginLine(stdout),
			}),
		),
		Effect.catch((failure) => Effect.succeed(refusal(failure))),
	);

export const makeCachedCapability = (executable: string): Effect.Effect<CachedCapability> =>
	Effect.gen(function* () {
		const cache = yield* Ref.make(Option.none<Held>());
		const read = Effect.gen(function* () {
			const now = yield* Clock.currentTimeMillis;
			const held = yield* Ref.get(cache);
			if (Option.isSome(held) && now - held.value.at < CACHE_MILLIS) {
				return held.value.value;
			}
			const value = yield* probe(executable);
			yield* Ref.set(cache, Option.some({ at: now, value }));
			return value;
		});
		return { forget: Ref.set(cache, Option.none()), read };
	});
