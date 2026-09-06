import type { BackendFailure } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Deferred, Effect } from "effect";
import { SessionAttachmentFailure } from "#errors.ts";

export const makeOpeningConfirmation = Effect.gen(function* () {
	const opened = yield* Deferred.make<string, BackendFailure | SessionAttachmentFailure>();
	const observe = Effect.fnUntraced(function* (event: AgentEvent, persisted: boolean) {
		if (event.type !== "session.opened") {
			return;
		}
		if (!persisted) {
			yield* Deferred.fail(
				opened,
				new SessionAttachmentFailure({
					detail: "failed to durably record native identity",
				}),
			);
			return;
		}
		yield* Deferred.succeed(opened, event.nativeRef);
	});
	return {
		await: Deferred.await(opened),
		fail: (failure: BackendFailure) => Deferred.fail(opened, failure),
		observe,
	};
});
