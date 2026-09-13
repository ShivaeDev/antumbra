import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { expect } from "vitest";
import { startViewer, stopViewer, withViewerOwnership } from "#fixture-viewer.ts";

it.effect(
	"reuses one checkout viewer and never stops a foreign owner",
	Effect.fnUntraced(function* () {
		const root = yield* Effect.acquireRelease(
			Effect.promise(() => mkdtemp(join(tmpdir(), "fixture-viewer-"))),
			(root) => Effect.promise(() => rm(root, { recursive: true, force: true })),
		);
		yield* Effect.promise(() => mkdir(join(root, "apps/desktop/script"), { recursive: true }));
		yield* Effect.promise(() => mkdir(join(root, ".fixtures/open"), { recursive: true }));
		yield* Effect.promise(() =>
			copyFile(fileURLToPath(new URL("./fixtures/viewer-child.ts", import.meta.url)), join(root, "apps/desktop/script/fixture.ts")),
		);
		const manifest = { label: "synthetic", captureCompletedAt: "2026-09-13T12:00:00Z" };
		const viewer = yield* withViewerOwnership(root, startViewer(root, manifest));
		const path = join(root, ".fixtures/viewer.json");
		const saved = yield* Effect.promise(() => readFile(path, "utf8"));
		yield* Effect.addFinalizer(() => Effect.promise(() => writeFile(path, saved)).pipe(Effect.andThen(stopViewer(root)), Effect.orDie));
		const reused = yield* withViewerOwnership(root, startViewer(root, manifest));
		expect(reused.url).toBe(viewer.url);
		const contended = yield* withViewerOwnership(root, Effect.exit(withViewerOwnership(root, Effect.void)));
		expect(Exit.isFailure(contended)).toBe(true);

		yield* Effect.promise(() => writeFile(path, JSON.stringify({ url: viewer.url, token: "different-owner" })));
		yield* stopViewer(root);
		const alive = yield* Effect.promise(() =>
			fetch(new URL("/__fixture/status", viewer.url), { headers: { Authorization: `Bearer ${viewer.token}` } }),
		);
		expect(alive.status).toBe(200);
		yield* Effect.promise(() => writeFile(path, saved));
		yield* stopViewer(root);
		expect(Exit.isFailure(yield* Effect.exit(Effect.tryPromise(() => fetch(viewer.url))))).toBe(true);
		expect(Exit.isFailure(yield* Effect.exit(Effect.tryPromise(() => readFile(path))))).toBe(true);
	}, Effect.scoped),
);
