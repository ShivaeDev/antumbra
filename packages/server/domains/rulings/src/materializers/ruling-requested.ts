import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { rulingRequested } from "#facts/ruling-requested.ts";
import { requestWrites, writeRequested } from "#materializers/requested.ts";
export const rulingRequestedMaterializer = materializer(rulingRequested, { writes: requestWrites, run: writeRequested });
