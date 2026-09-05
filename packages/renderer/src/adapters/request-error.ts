import { Data } from "effect";

export class RendererRequestError extends Data.TaggedError("RendererRequestError")<{ readonly message: string }> {}
