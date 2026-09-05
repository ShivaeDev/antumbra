import type { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";
import { piFailure } from "#failure.ts";

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

export type PiThinkingLevel = (typeof THINKING_LEVELS)[number];

export const piEfforts: ReadonlyArray<string> = THINKING_LEVELS;

const decodeLevel = Schema.decodeUnknownOption(Schema.Literals(THINKING_LEVELS));

export const thinkingLevel = (effort: Option.Option<string>): Effect.Effect<PiThinkingLevel | undefined, BackendFailure> =>
	Option.match(effort, {
		onNone: () => Effect.succeed(undefined),
		onSome: (value) =>
			Option.match(decodeLevel(value), {
				onNone: () => Effect.fail(piFailure(`effort ${value} is not a thinking level pi offers; choose one of ${THINKING_LEVELS.join(", ")}`)),
				onSome: Effect.succeed,
			}),
	});
