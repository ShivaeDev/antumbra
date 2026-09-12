import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { vi } from "vitest";
import { codexCommand, makeCodexBackend } from "#backends/codex/backend.ts";

vi.mock("#backends/codex/chatgpt-bundle.ts", () => ({ bundledCodex: Effect.succeed(Option.none()) }));

it.effect("a discovered CLI provides a backend with capacity and image input", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const command = yield* codexCommand(Option.some("/opt/homebrew/bin/codex"));
			expect(command).toEqual(Option.some("/opt/homebrew/bin/codex"));
			const backend = yield* makeCodexBackend({ command: "/opt/homebrew/bin/codex", cwd: "/tmp/antumbra", skills: "/tmp/antumbra/skills" });
			expect(backend.capabilities.imageInput).toBe(true);
			expect(backend.capacity).toBeDefined();
			if (backend.capacity !== undefined) expect(yield* backend.capacity.current).toEqual(Option.none());
		}),
	),
);

it.effect("an absent CLI and app bundle leave the backend unavailable", () =>
	Effect.gen(function* () {
		expect(yield* codexCommand(Option.none())).toEqual(Option.none());
	}),
);
