import type { DirectTool } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { chosenTools, loadedResources } from "#adapters/runtime.ts";
import { piTools } from "#adapters/tools.ts";
import type { PiOpenRequest } from "#runtime.ts";

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
	model: undefined,
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
