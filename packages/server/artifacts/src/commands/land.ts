import { land as command } from "@antumbra/domain-artifacts/commands/land.ts";
import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { ArtifactsHistory } from "@antumbra/server-journal/postgres/artifacts/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
import type { Landing } from "#landing.ts";

export const land = (serial: Semaphore.Semaphore) =>
	Effect.fn("Artifacts.land")(function* (input: typeof Landing.Type) {
		const history = yield* ArtifactsHistory;
		yield* history.checkRequest(input.requestId);
		const validated = yield* command.run({ ...input, digest: "", byteSize: input.bytes.length }, yield* history.rows(), command.reject);
		const stored = yield* (yield* ArtifactFiles).publish({ basename: input.basename, bytes: input.bytes });
		return yield* history.append(input.requestId, [{ _tag: "ArtifactLanded", ...validated, ...stored, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
