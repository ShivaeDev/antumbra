import type { DirectToolOutcome } from "@antumbra/plugin-api";
import { Option } from "effect";

export type ServedTool = (args: unknown) => Promise<DirectToolOutcome>;

export interface ToolSessions {
	readonly forget: (session: string) => void;
	readonly names: ReadonlyArray<string>;
	readonly remember: (session: string, tools: ReadonlyMap<string, ServedTool>) => void;
	readonly served: (session: string) => Option.Option<ReadonlyMap<string, ServedTool>>;
}

export const makeToolSessions = (names: ReadonlyArray<string>): ToolSessions => {
	const open = new Map<string, ReadonlyMap<string, ServedTool>>();
	return {
		forget: (session) => {
			open.delete(session);
		},
		names,
		remember: (session, tools) => {
			open.set(session, tools);
		},
		served: (session) => Option.fromNullishOr(open.get(session)),
	};
};
