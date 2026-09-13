import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { expect } from "vitest";
import { stopViewer, withViewerOwnership } from "#fixture/adapters/viewer-owner.ts";
import { startViewer } from "#fixture/adapters/viewer-process.ts";

it.effect(
	"reuses healthy viewers, resumes failed copies, and respects ownership",
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
		yield* Effect.addFinalizer(() => stopViewer(root).pipe(Effect.orDie));
		const reused = yield* withViewerOwnership(root, startViewer(root, manifest));
		expect(reused.url).toBe(viewer.url);
		const contended = yield* withViewerOwnership(root, Effect.exit(withViewerOwnership(root, Effect.void)));
		expect(Exit.isFailure(contended)).toBe(true);

		yield* Effect.gen(function* () {
			yield* Effect.promise(() => writeFile(path, JSON.stringify({ url: viewer.url, token: "different-owner" })));
			yield* stopViewer(root);
			const alive = yield* Effect.promise(() =>
				fetch(new URL("/__fixture/status", viewer.url), { headers: { Authorization: `Bearer ${viewer.token}` } }),
			);
			expect(alive.status).toBe(200);
		}).pipe(Effect.ensuring(Effect.promise(() => writeFile(path, saved))));
		const edit = join(root, ".fixtures/open/experiment.txt");
		yield* Effect.promise(() => writeFile(edit, "local edit"));
		yield* Effect.promise(() => fetch(new URL("/fail", viewer.url), { headers: { Authorization: `Bearer ${viewer.token}` } }));
		const restarted = yield* withViewerOwnership(root, startViewer(root, manifest));
		expect(restarted.url).not.toBe(viewer.url);
		expect(yield* Effect.promise(() => readFile(edit, "utf8"))).toBe("local edit");
		expect(Exit.isFailure(yield* Effect.exit(Effect.tryPromise(() => fetch(viewer.url))))).toBe(true);
		yield* stopViewer(root);
		expect(Exit.isFailure(yield* Effect.exit(Effect.tryPromise(() => fetch(restarted.url))))).toBe(true);
		expect(Exit.isFailure(yield* Effect.exit(Effect.tryPromise(() => readFile(path))))).toBe(true);
	}, Effect.scoped),
);

it.effect(
	"reports a supervisor spawn failure and releases ownership",
	Effect.fnUntraced(function* () {
		const root = yield* Effect.acquireRelease(
			Effect.promise(() => mkdtemp(join(tmpdir(), "fixture-viewer-"))),
			(root) => Effect.promise(() => rm(root, { recursive: true, force: true })),
		);
		yield* Effect.promise(() => mkdir(join(root, ".fixtures/open"), { recursive: true }));
		const failure = yield* withViewerOwnership(root, startViewer(root, { label: "missing", captureCompletedAt: "2026-09-13T12:00:00Z" })).pipe(
			Effect.flip,
		);
		expect(String(failure.cause)).toContain("ENOENT");
		expect(yield* withViewerOwnership(root, Effect.succeed("released"))).toBe("released");
	}, Effect.scoped),
);
