import { join } from "node:path";

// Claude Code reads this directory as a local plugin and finds `skills/<name>/SKILL.md` under it; Codex and OpenCode are pointed at that inner folder.
export const skillFolders = (skillsDirectory: string): string => join(skillsDirectory, "skills");
