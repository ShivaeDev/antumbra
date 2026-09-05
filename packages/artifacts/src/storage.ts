import { Context } from "effect";

export class ArtifactStorage extends Context.Service<ArtifactStorage, { readonly root: string }>()("@antumbra/artifacts/ArtifactStorage") {}
