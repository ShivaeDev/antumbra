import { ellipsisStyle } from "#views/styles.ts";

// why: the row decides how much of an identifier is shown; the reader gets the
// whole of it from the title rather than from a wider window.
export const Truncated = ({
	style,
	text,
}: {
	readonly style?: React.CSSProperties;
	readonly text: string;
}) => (
	<span style={{ ...style, ...ellipsisStyle }} title={text}>
		{text}
	</span>
);
