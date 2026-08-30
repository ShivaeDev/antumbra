// why: a charter is prose a model reads top to bottom, so an empty section is
// worse than a missing one — a heading with nothing under it reads as a claim
// about the voyage rather than as the absence of writing.
export const section = (heading: string, body: string): ReadonlyArray<string> => (body.trim() === "" ? [] : [`# ${heading}`, body.trim(), ""]);

export const logSection = (heading: string, log: ReadonlyArray<string>): ReadonlyArray<string> => section(heading, log.join("\n\n"));

export const proseOf = (sections: ReadonlyArray<ReadonlyArray<string>>): string => sections.flat().join("\n").trimEnd();
