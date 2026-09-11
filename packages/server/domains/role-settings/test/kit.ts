import { testing } from "@antumbra/journal/testing/entry.ts";
import { Effect, Option, Stream } from "effect";
import { roleSettings } from "#feature.ts";

export const it = testing([roleSettings]);

export const reef = "voyage-reef";

export const shallows = "voyage-shallows";

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
