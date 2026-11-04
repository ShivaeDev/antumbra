import { Context } from "effect";
export class InputStorage extends Context.Service<InputStorage, { readonly root: string }>()("@antumbra/server-inputs/InputStorage") {}
