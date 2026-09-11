import { app } from "@antumbra/journal/app.ts";
import { testing } from "@antumbra/journal/testing/entry.ts";
import { Effect, Option, Stream } from "effect";
import { settings } from "#feature.ts";

export const settingsApp = app([settings]);

export const it = testing(settingsApp);

export const answered = <Value, Failure>(stream: Stream.Stream<Value, Failure>): Effect.Effect<Value, Failure> =>
	Effect.map(Stream.runHead(stream), Option.getOrThrow);
