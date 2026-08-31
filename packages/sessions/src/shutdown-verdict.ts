import type { IntentStatus } from "@antumbra/kernel";
import { Effect, Option } from "effect";
import { SessionShutdownIncomplete } from "#shutdown.ts";

export const requireSiestaSucceeded = (intentId: string, sessionId: string, status: Option.Option<IntentStatus>) =>
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
