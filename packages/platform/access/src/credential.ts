import { Context } from "effect";

export class Credential extends Context.Service<Credential, { readonly token: string }>()("@antumbra/platform-access/Credential") {}
