import { DebugRpc } from "@antumbra/platform-rpc/debug.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";

export const debugHandlers = DebugRpc.toLayer({
	"debug.rebuildProjections": () => Commit.use((commit) => commit.rebuild),
});
