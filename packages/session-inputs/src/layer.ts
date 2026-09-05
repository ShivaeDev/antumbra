import { Layer } from "effect";
import { SessionInputs } from "#service.ts";
import { StorageRoot } from "#storage-root.ts";

export const sessionInputsLayer = (root: string) => SessionInputs.layer.pipe(Layer.provide(Layer.succeed(StorageRoot)(root)));
