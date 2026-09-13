import type { ReactNode } from "react";
import { cn } from "#class-names.ts";
import { ScrollArea } from "#shadcn/scroll-area.tsx";

export const TwoPane = ({ list, pane }: { readonly list: ReactNode; readonly pane?: ReactNode }) => (
	<div className="flex h-full">
		<div className={cn("w-[360px] shrink-0 border-r", pane === undefined ? undefined : "max-[1139px]:hidden")}>
			<ScrollArea className="h-full">{list}</ScrollArea>
		</div>
		{pane === undefined ? null : <div className="min-w-0 flex-1">{pane}</div>}
	</div>
);
