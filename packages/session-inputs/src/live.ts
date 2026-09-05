import { Layer } from "effect";
import { SessionInputs } from "#session-inputs.ts";
import { StorageRoot } from "#storage-root.ts";

export const SessionInputsLive = (root: string) => SessionInputs.layer.pipe(Layer.provide(Layer.succeed(StorageRoot)(root)));
