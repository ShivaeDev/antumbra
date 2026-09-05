import { Context } from "effect";

export class StorageRoot extends Context.Service<StorageRoot, string>()("@antumbra/session-inputs/StorageRoot") {}
