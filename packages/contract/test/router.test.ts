import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer, ManagedRuntime } from "effect";
import { AppInfoSource, makeAppRouter } from "#index.js";

describe("makeAppRouter", () => {
	it.effect("serves app info from the runtime's source", () =>
		Effect.gen(function* () {
			const info = {
				chromeVersion: "138.0.0.0",
				electronVersion: "43.3.0",
				nodeVersion: "22.21.0",
				productVersion: "0.0.0",
			};
			const runtime = ManagedRuntime.make(
				Layer.succeed(AppInfoSource, { current: Effect.succeed(info) }),
			);
			const router = makeAppRouter(runtime);
			const caller = router.createCaller({ senderId: 7 });
			const served = yield* Effect.promise(() => caller.appInfo());
			expect(served).toEqual(info);
			yield* Effect.promise(() => runtime.dispose());
		}),
	);
});
