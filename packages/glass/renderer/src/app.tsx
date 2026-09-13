import { ProviderCapacities } from "@antumbra/glass-capacity/capacity.tsx";
import { Toaster } from "@antumbra/glass-components/shadcn/sonner.tsx";
import { LoopToasts } from "@antumbra/glass-errors/loop-toasts.tsx";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { useState } from "react";
import { ConsoleMain } from "#navigation/console-main.tsx";
import { Navigation } from "#navigation/navigation.tsx";
import { NoticeBar } from "#notice-bar.tsx";
import type { RendererProps } from "#props.ts";

export const ConsoleApp = (props: RendererProps & { readonly place: ConsolePlace }) => {
	const [notice, setNotice] = useState<string>();
	return (
		<Navigation api={props.api} shell={props.shell} place={props.place} onError={setNotice}>
			{(place, onPlace, foldToolCalls) => (
				<>
					<NoticeBar notice={notice} onDismiss={() => setNotice(undefined)} />
					<ProviderCapacities api={props.api} />
					<LoopToasts api={props.api} onOpen={() => onPlace({ ...place, mode: "errors" })} />
					<ConsoleMain {...props} place={place} onPlace={onPlace} foldToolCalls={foldToolCalls} onError={setNotice} />
					<Toaster />
				</>
			)}
		</Navigation>
	);
};
