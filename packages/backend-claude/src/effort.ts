import type { EffortLevel } from "@anthropic-ai/claude-agent-sdk";
import { BackendFailure } from "@antumbra/plugin-api";
import { Effect, Option, Schema } from "effect";

const EFFORT_LEVELS = ["low", "medium", "high", "xhigh", "max"] as const;

const decodeLevel = Schema.decodeUnknownOption(Schema.Literals(EFFORT_LEVELS));

export const effortLevel = (effort: Option.Option<string>): Effect.Effect<EffortLevel | undefined, BackendFailure> =>
	Option.match(effort, {
		onNone: () => Effect.succeed(undefined),
		onSome: (value) =>
			Option.match(decodeLevel(value), {
				onNone: () =>
					Effect.fail(
						new BackendFailure({
							detail: `effort ${value} is not a level Claude offers; choose one of ${EFFORT_LEVELS.join(", ")}`,
							tag: "claude",
						}),
					),
				onSome: Effect.succeed,
			}),
	});
