import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Logger } from "effect";
import { DevTraceLive } from "#layer.ts";

const temporaryDirectory = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-trace-degrade-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

it.effect("an unavailable trace database does not stop the app", () =>
	Effect.gen(function* () {
		const warnings: string[] = [];
		const logger = Logger.layer([
			Logger.make<unknown, void>((options) => {
				warnings.push(String(options.message));
			}),
		]);
		const absent = join(yield* temporaryDirectory, "no-such-directory");
		const answer = yield* Effect.scoped(
			Effect.provide(
				Effect.succeed("carried on").pipe(Effect.withSpan("run")),
				Layer.provide(
					DevTraceLive({
						appVersion: "0.0.0-test",
						dataDirectory: absent,
					}),
					logger,
				),
			),
		);
		expect(answer).toBe("carried on");
		expect(warnings.filter((entry) => entry.includes("dev trace sink disabled"))).toHaveLength(1);
	}),
);
