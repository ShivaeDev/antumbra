import { RestartRpc } from "@antumbra/platform-runner/lifecycle.ts";
import { abandonRestart } from "#lifecycle/abandon-restart.ts";
import { drain } from "#lifecycle/drain.ts";
import { honorRestart } from "#lifecycle/honor-restart.ts";
import { recordRestart } from "#lifecycle/record-restart.ts";

export const lifecycleHandlers = RestartRpc.toLayer({
	"restart.drain": drain,
	"restart.record": recordRestart,
	"restart.honor": honorRestart,
	"restart.abandon": abandonRestart,
});
