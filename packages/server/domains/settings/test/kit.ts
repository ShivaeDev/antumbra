import { testing } from "@antumbra/server-journal/testing/entry.ts";
import { Effect, Option, Stream } from "effect";
import { settings } from "#feature.ts";

export const it = testing([settings]);

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
