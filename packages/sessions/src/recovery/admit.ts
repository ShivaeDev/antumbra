import type { SessionInput } from "@antumbra/plugin-api";
import type { SessionAttachment } from "@antumbra/session-fabric";
import { Effect } from "effect";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import { SessionRecoveryHeld } from "#recovery/error.ts";

export const admitRecoveredSession = (context: SessionRecoveryContext, instruction: SessionInput) =>
	Effect.fnUntraced(function* (attachment: SessionAttachment) {
		// Some providers announce resumed identity only after first input; a mismatched conversation is refused immediately afterward.
		yield* attachment.handle.queue(instruction);
		const openedNativeRef = yield* attachment.openedNativeRef;
		if (openedNativeRef !== context.nativeRef) {
			return yield* new SessionRecoveryHeld({
				detail: `provider resumed native session ${openedNativeRef}, expected ${context.nativeRef}`,
			});
		}
	});
