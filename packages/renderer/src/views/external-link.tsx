import type { ReactNode } from "react";
import { openExternal } from "#adapters/bridge.ts";
import { linkStyle } from "#views/styles.ts";

// why: the window follows no navigation of its own, so a link is a request to
// hand the address to the browser the reader already works in.
export const ExternalLink = ({
	children,
	style,
	url,
}: {
	readonly children: ReactNode;
	readonly style?: React.CSSProperties;
	readonly url: string;
}) => (
	<a
		href={url}
		onClick={(event) => {
			event.preventDefault();
			openExternal(url);
		}}
		style={{ ...linkStyle, ...style }}
	>
		{children}
	</a>
);
