import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const packageRoot = (name: string): string => dirname(fileURLToPath(import.meta.resolve(`${name}/package.json`)));
