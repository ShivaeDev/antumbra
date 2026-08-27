import {
	acquireTemporaryPersistence,
	type TemporaryPersistence,
} from "@antumbra/persistence/testing";
import { Layer, Stream } from "effect";
import { type IntentStatus, isTerminalIntentStatus } from "#fsm.ts";
import { KernelLive, type KernelOptions } from "#layer.ts";

export { acquireTemporaryPersistence };

export const kernelLayer = (
	temporary: TemporaryPersistence,
	options: KernelOptions,
) => KernelLive(options).pipe(Layer.provideMerge(temporary.layer));

export const statusesUntilTerminal = <E, R>(
	changes: Stream.Stream<IntentStatus, E, R>,
) => changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runCollect);
