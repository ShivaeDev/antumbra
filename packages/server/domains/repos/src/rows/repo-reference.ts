import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { RepoId } from "#ids.ts";

export const repoReference = row("repoReference", { id: Schema.String, repoId: RepoId }, { key: "id", scope: "repoId" });
