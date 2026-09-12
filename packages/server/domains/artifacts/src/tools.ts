import { landArtifactTool } from "#tools/land.ts";
import { removeArtifactSupersessionTool, supersedeArtifactTool } from "#tools/lineage.ts";
export const artifactsTools = [landArtifactTool, supersedeArtifactTool, removeArtifactSupersessionTool] as const;
