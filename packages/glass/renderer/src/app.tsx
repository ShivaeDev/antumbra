import { ProviderCapacities } from "@antumbra/glass-capacity/capacity.tsx";
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
					<ConsoleMain {...props} place={place} onPlace={onPlace} foldToolCalls={foldToolCalls} onError={setNotice} />
				</>
			)}
		</Navigation>
	);
};
