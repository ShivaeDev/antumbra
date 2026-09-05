import { join } from "node:path";

export const skillFolders = (pluginDirectory: string): string => join(pluginDirectory, "skills");
