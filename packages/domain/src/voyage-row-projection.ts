export const byId = <A extends { readonly id: string }>(rows: ReadonlyArray<A>): ReadonlyMap<string, A> => new Map(rows.map((row) => [row.id, row]));
