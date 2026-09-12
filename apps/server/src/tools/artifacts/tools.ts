import { landArtifactTool } from "#tools/artifacts/land.ts";
import { removeArtifactSupersessionTool, supersedeArtifactTool } from "#tools/artifacts/lineage.ts";
export const artifactsTools = [landArtifactTool, supersedeArtifactTool, removeArtifactSupersessionTool] as const;
