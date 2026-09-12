import { Effect } from "effect";
import { createContext, type ReactNode, useContext } from "react";
import { cn } from "#class-names.ts";

export const ExternalLinkContext = createContext<((url: string) => void) | undefined>(undefined);

export const ExternalLink = ({ children, className, url }: { readonly children: ReactNode; readonly className?: string; readonly url: string }) => {
	const open = useContext(ExternalLinkContext);
	return (
		<a
			className={cn("text-link underline-offset-4 hover:underline", className)}
			href={url}
			onClick={(event) => {
				event.preventDefault();
				if (open === undefined) {
					Effect.runSync(Effect.die("The glass requires an ExternalLinkContext provider"));
					return;
				}
				open(url);
			}}
		>
			{children}
		</a>
	);
};
