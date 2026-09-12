import { LifecycleRpc } from "@antumbra/domain-lifecycle/commands/restart.ts";
import { abandonRestart } from "#lifecycle/abandon-restart.ts";
import { drain } from "#lifecycle/drain.ts";
import { honorRestart } from "#lifecycle/honor-restart.ts";
import { recordRestart } from "#lifecycle/record-restart.ts";

export const lifecycleHandlers = LifecycleRpc.toLayer({
	"lifecycle.drain": drain,
	"lifecycle.recordRestart": recordRestart,
	"lifecycle.honorRestart": honorRestart,
	"lifecycle.abandonRestart": abandonRestart,
});
