import {
	type TemporaryPersistence,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { Effect, Layer, Stream } from "effect";
import { type IntentStatus, isTerminalIntentStatus } from "#fsm.ts";
import { KernelLive, type KernelOptions } from "#layer.ts";

export const acquireTemporaryPersistence = Effect.acquireRelease(
	Effect.sync(temporaryPersistence),
	(temporary) => Effect.sync(temporary.remove),
);

export const kernelLayer = (
	temporary: TemporaryPersistence,
	options: KernelOptions,
) => KernelLive(options).pipe(Layer.provideMerge(temporary.layer));

export const statusesUntilTerminal = <E, R>(
	changes: Stream.Stream<IntentStatus, E, R>,
) => changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runCollect);
