import { Context } from "effect";

export class Files extends Context.Service<Files, { readonly root: string }>()("@antumbra/server/Files") {}
