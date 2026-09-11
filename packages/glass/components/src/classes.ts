const FIELD =
	"w-full min-w-0 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none transition-colors focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50";

const WRITABLE = "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground";

export const CONTROL = `h-7 ${FIELD}`;

export const TEXT_CONTROL = `${CONTROL} ${WRITABLE}`;

export const LINES_CONTROL = `min-h-16 py-1.5 ${FIELD} ${WRITABLE}`;

export const SAVE =
	"inline-flex h-7 w-full shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-input/40 px-2 text-2xs font-medium outline-none transition-colors hover:border-border-strong hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50";

export const ROW = "flex min-w-0 flex-wrap items-start gap-x-2 gap-y-0.5";

export const HEAD = "flex w-[4.5rem] shrink-0 flex-col gap-0.5";

export const NAME = "flex h-7 items-center text-xs";

export const CELL = "flex min-w-0 flex-1 flex-col gap-0.5";

export const TITLE = "text-2xs leading-4 text-muted-foreground";

export const ALERT = "text-2xs leading-4 text-destructive";

export const NOTE = "text-xs text-muted-foreground";
