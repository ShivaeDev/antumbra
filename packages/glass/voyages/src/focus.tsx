import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { useCommand } from "@antumbra/glass-client/hooks.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { PinIcon } from "lucide-react";
import type { VoyagesApi } from "#glass.ts";

export const FocusToggle = (props: { readonly api: VoyagesApi; readonly voyageId: string; readonly focused: boolean }) => {
	const action = useCommand(props.api.voyages.setFocus);
	const label = props.focused ? "Drop focus" : "Focus this voyage";
	return (
		<>
			<Button
				aria-label={label}
				aria-pressed={props.focused}
				disabled={action.pending}
				onClick={() => action.run({ id: VoyageId.make(props.voyageId), focused: !props.focused })}
				size="icon"
				title={label}
				variant="ghost"
			>
				<PinIcon className={props.focused ? "fill-current text-foreground" : "text-muted-foreground"} />
			</Button>
			{AsyncResult.isFailure(action.result) ? <p role="alert">{messageOf(action.result.cause)}</p> : null}
		</>
	);
};
