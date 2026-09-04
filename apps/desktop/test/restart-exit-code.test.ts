import { expect, it } from "@effect/vitest";
import { exitAsksForRestart, RESTART_EXIT_CODE } from "#restart-exit-code.ts";

it("continues the dev loop only for the restart exit code", () => {
	expect(exitAsksForRestart(RESTART_EXIT_CODE)).toBe(true);
	expect(exitAsksForRestart(0)).toBe(false);
	expect(exitAsksForRestart(1)).toBe(false);
});
