import type { Capability } from "@antumbra/platform-vocabulary/change-host.ts";
import { Clock, Effect, Option, Ref } from "effect";
import { runGh } from "#command.ts";
import type { GhError } from "#errors.ts";
import type { GhProcess } from "#process.ts";

const AUTH_TIMEOUT_MILLIS = 15_000;

// A watcher reads this every pass; cache the process-backed probe briefly.
const CACHE_MILLIS = 60_000;

export interface CachedCapability {
	readonly forget: Effect.Effect<void>;
	readonly read: Effect.Effect<Capability, never, GhProcess>;
}

interface Held {
	readonly at: number;
	readonly value: Capability;
}

const loginLine = (stdout: string): string => {
	const line = stdout
		.split("\n")
		.map((text) => text.trim().replace(/^[✓✗•-]\s*/, ""))
		.find((text) => text.startsWith("Logged in"));
	return line === undefined || line === "" ? "authenticated" : line;
};

const missingBinary = (failure: GhError): boolean => {
	const detail = failure.detail.toLowerCase();
	return failure._tag === "GhUnavailable" && (detail.includes("notfound") || detail.includes("not found") || detail.includes("enoent"));
};

const refusal = (failure: GhError): Capability =>
	missingBinary(failure) ? { available: false, detail: "gh CLI not found" } : { available: false, detail: failure.detail };

const probe = (executable: string): Effect.Effect<Capability, never, GhProcess> =>
	runGh({
		args: ["auth", "status", "--hostname", "github.com"],
		executable,
		operation: "auth-status",
		timeoutMillis: AUTH_TIMEOUT_MILLIS,
	}).pipe(
		Effect.map(
			(stdout): Capability => ({
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
