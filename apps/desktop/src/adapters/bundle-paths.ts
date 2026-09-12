import { join } from "node:path";
export const packagedChildBundle = (appPath: string, child: "runner" | "server"): string => join(appPath, "out", `${child}.js`);
