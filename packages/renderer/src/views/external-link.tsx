import type { ReactNode } from "react";
import { openExternal } from "#adapters/bridge.ts";
import { cn } from "#lib/utils.ts";

// why: the window follows no navigation of its own, so a link is a request to
// hand the address to the browser the reader already works in.
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
