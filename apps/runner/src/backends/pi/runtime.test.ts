import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { piTools } from "@antumbra/runner-backends-pi/adapters/tools.ts";
import type { PiOpenRequest } from "@antumbra/runner-backends-pi/runtime.ts";
import type { DirectTool } from "@antumbra/runner-ports/tools.ts";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chosenTools, loadedResources, sessions } from "#backends/pi/adapters/runtime.ts";

const readBoard: DirectTool = {
	call: () => Effect.succeed({ ok: true, text: "the board" }),
	description: "Read the board.",
	inputSchema: { properties: {}, type: "object" },
	name: "read_board",
};

const request = (constrainedPrompt: string | undefined, tools: ReadonlyArray<DirectTool> = []): PiOpenRequest => ({
	constrainedPrompt,
	cwd: "/moorage",
	effort: undefined,
	model: "anthropic/claude-sonnet-4-5",
	resume: undefined,
	tools: piTools(tools, () => Promise.resolve({ ok: true, text: "" })),
});

it("an ordinary session keeps everything pi discovers and adds Antumbra's skills", () => {
	expect(loadedResources(request(undefined), "/antumbra/skills")).toEqual({ additionalSkillPaths: ["/antumbra/skills"] });
	expect(chosenTools(request(undefined, [readBoard]))).toEqual({});
});

it("a constrained session runs on Antumbra's prompt, discovering none of the admiral's resources and no skills folder", () => {
	expect(loadedResources(request("Smooth this board."), "/antumbra/skills")).toEqual({
		noContextFiles: true,
		noExtensions: true,
		noPromptTemplates: true,
		noSkills: true,
		noThemes: true,
		systemPrompt: "Smooth this board.",
	});
});

it("a constrained session is allowed exactly the tools it was given", () => {
	expect(chosenTools(request("Smooth this board.", [readBoard]))).toEqual({ tools: ["read_board"] });
	expect(chosenTools(request("Smooth this board."))).toEqual({ tools: [] });
});

const nativeHistory = (cwd: string): string =>
	[
		{ type: "session", version: 3, id: "persisted-pi-session", timestamp: "2026-09-05T00:00:00Z", cwd },
		{
			type: "message",
			id: "message-1",
			parentId: null,
			timestamp: "2026-09-05T00:00:00Z",
			message: { role: "user", content: "Remember this charter", timestamp: 1 },
		},
	]
		.map((entry) => JSON.stringify(entry))
		.join("\n");

const resumeHistory = Effect.fnUntraced(function* (directory: string) {
	const file = join(directory, "session.jsonl");
	yield* Effect.promise(() => writeFile(file, nativeHistory(directory)));
	const manager = sessions({ ...request(undefined), cwd: directory, resume: file });
	expect(manager.getSessionFile()).toBe(file);
	expect(manager.getSessionId()).toBe("persisted-pi-session");
	expect(manager.getBranch()).toMatchObject([{ type: "message", message: { content: "Remember this charter" } }]);
});

it.effect("resumes the same native file and its recorded history without opening a model session", () =>
	Effect.acquireUseRelease(
		Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-pi-"))),
		resumeHistory,
		(directory) => Effect.promise(() => rm(directory, { recursive: true, force: true })),
	),
);
