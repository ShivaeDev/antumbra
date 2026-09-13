import type { ReactNode } from "react";
import { Separator } from "#shadcn/separator.tsx";

export const Marker = ({ children }: { readonly children: ReactNode }) => (
	<div className="my-3 flex items-center gap-2">
		<Separator className="flex-1" />
		<span className="text-xs whitespace-nowrap text-muted-foreground">{children}</span>
		<Separator className="flex-1" />
	</div>
);
