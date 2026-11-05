import { land as command } from "@antumbra/domain-artifacts/commands/land.ts";
import type { Landing } from "@antumbra/domain-artifacts/commands/landing.ts";
import { ArtifactFiles } from "@antumbra/domain-artifacts/ports/files.ts";
import { land as commandDecision } from "@antumbra/server-artifacts/logic/commands/land.ts";
import { ArtifactsHistory } from "@antumbra/server-storage/artifacts/service.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { Clock, Effect, type Semaphore } from "effect";

export const land = (serial: Semaphore.Semaphore) =>
	Effect.fn("Artifacts.land")(
		function* (input: typeof Landing.Type) {
			const history = yield* ArtifactsHistory;
			yield* history.checkRequest(input.requestId);
			const validated = yield* commandDecision({ ...input, digest: "", byteSize: input.bytes.length }, command.reject);
			const stored = yield* (yield* ArtifactFiles).publish({ basename: input.basename, bytes: input.bytes });
			return yield* history.append(input.requestId, [{ _tag: "ArtifactLanded", ...validated, ...stored, at: yield* Clock.currentTimeMillis }]);
		},
		serial.withPermit,
		withExecutionWrite,
	);
