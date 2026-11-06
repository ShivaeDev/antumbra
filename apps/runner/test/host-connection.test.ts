import { applicationStory } from "@antumbra/app-testing/application-story.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { expect } from "vitest";
import { nativeRunner } from "#test/connection-kit.ts";

const story = storyKit({ name: "Hosted runner connection", extends: [applicationStory, nativeRunner] });

story.it("the production runner connects over Unix with its machine credential", [], function* ({ host, runner }) {
	expect(yield* runner(yield* host())).toBe(-1);
});

story.it("paces a reconnect without giving up after a transport failure", [], function* ({ host, recovering }) {
	const response = yield* recovering(yield* host());
	expect(yield* response.state).toBe("waiting");
	yield* response.advance(999);
	expect(yield* response.state).toBe("waiting");
	yield* response.advance(1);
	expect(yield* response.result).toBe("reconnected");
});
