export const tableKey = (row: string): string => row;

export const scopeKey = (row: string, scope: unknown): string => `${row}:${String(scope)}`;
