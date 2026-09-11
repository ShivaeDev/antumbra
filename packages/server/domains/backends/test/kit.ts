import { testing } from "@antumbra/server-journal/testing/entry.ts";
import { Effect, Option, Stream } from "effect";
import { backends } from "#feature.ts";

export const it = testing([backends]);

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
