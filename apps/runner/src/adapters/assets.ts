import { join } from "node:path";
export const assets = (directory: string) => ({ skills: join(directory, "skills"), plugin: join(directory, "opencode", "caller-session.js") });
