import { Files } from "@antumbra/server/files.ts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, FileSystem, Layer } from "effect";

export const layer = Layer.effect(
	Files,
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return { root: yield* fs.makeTempDirectoryScoped({ prefix: "antumbra-test-" }) };
	}).pipe(Effect.orDie),
).pipe(Layer.provideMerge(NodeServices.layer));
