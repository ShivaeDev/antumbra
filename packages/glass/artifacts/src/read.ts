import type { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { useAtomValue } from "@effect/atom-react";
import * as Atom from "effect/unstable/reactivity/Atom";
import { useMemo } from "react";
import type { ReadArtifact } from "#glass.ts";
export const useArtifact = (read: ReadArtifact, id: ArtifactId) => useAtomValue(useMemo(() => Atom.make(read(id)), [read, id]));
