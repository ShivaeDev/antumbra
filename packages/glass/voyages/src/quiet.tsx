import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type { VoyagesApi } from "#glass.ts";

export const QUIET_CHIP = "quiet by you";
export const QUIET_DETAIL = "nothing is sent to it until you resume it";

export const QuietAct = (props: { readonly api: VoyagesApi; readonly voyageId: string; readonly quieted: boolean }) => {
	const quieting = useCommand(props.api.voyages.quiet);
	const resuming = useCommand(props.api.voyages.resume);
	const action = props.quieted ? resuming : quieting;
	const label = props.quieted ? "Resume" : "Quiet";
	return (
		<>
			<Button disabled={action.pending} onClick={() => action.run({ id: VoyageId.make(props.voyageId) })} size="sm" variant="outline">
				{label}
			</Button>
			{AsyncResult.isFailure(action.result) ? <p role="alert">{messageOf(action.result.cause)}</p> : null}
		</>
	);
};
