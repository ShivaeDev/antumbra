import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { readArtifact } from "#adapters/artifacts.ts";
import { resolveInput } from "#adapters/inputs.ts";

const directory = Effect.acquireRelease(
	Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-runner-files-"))),
	(path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
);

it.live("reads an authored UTF-8 artifact with its filename", () =>
	Effect.gen(function* () {
		const root = yield* directory;
		yield* Effect.promise(() => writeFile(join(root, "report.md"), "# Findings\n\nA café.\n"));
		expect(yield* readArtifact(root, "report.md")).toEqual({ type: "ArtifactRead", name: "report.md", content: "# Findings\n\nA café.\n" });
	}),
);

it.live("rejects source bytes that cannot be published as UTF-8", () =>
	Effect.gen(function* () {
		const root = yield* directory;
		yield* Effect.promise(() => writeFile(join(root, "report.md"), new Uint8Array([0xff])));
		expect((yield* Effect.flip(readArtifact(root, "report.md"))).detail).toContain("encoded data");
	}),
);

it.live("resolves digest-backed input to shared managed image custody", () =>
	Effect.gen(function* () {
		const root = yield* directory;
		yield* Effect.promise(() => mkdir(join(root, "digest")));
		yield* Effect.promise(() => writeFile(join(root, "digest", "image.png"), new Uint8Array([1, 2, 3])));
		const resolved = yield* resolveInput(root, {
			id: "input",
			parts: [{ type: "image", attachmentId: "attachment", digest: "digest", mediaType: "image/png", position: 0 }],
		});
		expect(resolved.parts).toEqual([
			{ type: "image", attachmentId: "attachment", mediaType: "image/png", position: 0, path: join(root, "digest", "image.png") },
		]);
	}),
);
