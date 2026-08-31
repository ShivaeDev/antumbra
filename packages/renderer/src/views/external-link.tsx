import type { ReactNode } from "react";
import { openExternal } from "#adapters/bridge.ts";
import { cn } from "#lib/utils.ts";

export const ExternalLink = ({ children, className, url }: { readonly children: ReactNode; readonly className?: string; readonly url: string }) => (
	<a
		className={cn("text-link underline-offset-4 hover:underline", className)}
		href={url}
		onClick={(event) => {
			event.preventDefault();
			openExternal(url);
		}}
	>
		{children}
	</a>
);
