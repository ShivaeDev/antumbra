import { execFileSync } from "node:child_process";
import { accessSync } from "node:fs";
import { expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { vi } from "vitest";
import { bundledCodex } from "#adapters/chatgpt-bundle.ts";

vi.mock("node:os", () => ({ platform: () => "darwin" }));
vi.mock("node:child_process", () => ({ execFileSync: vi.fn(() => "/installed/ChatGPT.app/\n") }));
vi.mock("node:fs", () => ({ accessSync: vi.fn(), constants: { X_OK: 1 } }));

it.effect("finds Codex inside the ChatGPT bundle registered with macOS", () =>
	Effect.gen(function* () {
		expect(yield* bundledCodex).toEqual(Option.some("/installed/ChatGPT.app/Contents/Resources/codex"));
		expect(accessSync).toHaveBeenCalledWith("/installed/ChatGPT.app/Contents/Resources/codex", 1);
	}),
);

it.effect("an uninstalled ChatGPT bundle stays absent", () =>
	Effect.gen(function* () {
		vi.mocked(execFileSync).mockReturnValueOnce("\n");
		expect(yield* bundledCodex).toEqual(Option.none());
	}),
);
