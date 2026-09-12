import { feature } from "@antumbra/platform-feature/feature.ts";
import { queues } from "#queries/queues.ts";
export const holds = feature("holds", { rows: queues.reads, facts: [], commands: [], materializers: [], queries: [queues] });
