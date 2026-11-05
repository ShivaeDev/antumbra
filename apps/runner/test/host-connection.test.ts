import { applicationStory } from "@antumbra/app-testing/application-story.ts";
import type { hosted } from "@antumbra/app-testing/hosted.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import { connected, connection, RunnerClient } from "#connection.ts";

const runner = (host: Effect.Success<ReturnType<typeof hosted>>) =>
	connected(RunnerClient.use(({ calls }) => calls["runner.cursor"]({ logId: "runner:production-adapter" }))).pipe(
		Effect.provide(connection(`ws+unix://${host.socketPath}:/rpc`, host.machineToken)),
	);

const nativeRunner = storyKit({
	name: "Native runner",
	clock: "test",
	layer: Layer.empty,
	stages: [],
	create: () => Effect.succeed({ runner }),
	verbs: (engine) => engine,
});
const story = storyKit({ name: "Hosted runner connection", extends: [applicationStory, nativeRunner] });

story.it("the production runner connects over Unix with its machine credential", [], function* ({ host, runner }) {
	expect(yield* runner(yield* host())).toBe(-1);
});
