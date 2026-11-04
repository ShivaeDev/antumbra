import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { RepoReference } from "@antumbra/platform-vocabulary/repos.ts";
import { ReposHistory } from "@antumbra/server-journal/postgres/repos/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
export const observeReferences = (serial: Semaphore.Semaphore) =>
	Effect.fn("Repos.observeReferences")(function* (requestId: Request, references: readonly (typeof RepoReference.Type)[]) {
		const history = yield* ReposHistory;
		return yield* history.append(requestId, [{ _tag: "RepoReferencesObserved", references, at: yield* Clock.currentTimeMillis }]);
	}, serial.withPermit);
