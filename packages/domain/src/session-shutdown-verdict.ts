import type { IntentStatus } from "@antumbra/kernel";
import { Effect, Option } from "effect";
import { SessionShutdownIncomplete } from "#session-shutdown.ts";

// why: a drain is only over when every siesta it asked for succeeded. An Intent
// that failed, was cancelled, or vanished from the table each leave a Session
// that was told to finish and did not, so the quit says so rather than closing
// over the difference.
export const requireSiestaSucceeded = (
	intentId: string,
	sessionId: string,
	status: Option.Option<IntentStatus>,
) =>
	Option.match(status, {
		onNone: () =>
			Effect.fail(
				new SessionShutdownIncomplete({
					intentId,
					sessionId,
					status: "missing",
				}),
			),
		onSome: (value) =>
			value === "succeeded"
				? Effect.void
				: Effect.fail(
						new SessionShutdownIncomplete({
							intentId,
							sessionId,
							status: value,
						}),
					),
	});
