export const section = (heading: string, body: string): ReadonlyArray<string> => (body.trim() === "" ? [] : [`# ${heading}`, body.trim(), ""]);

export const logSection = (heading: string, log: ReadonlyArray<string>): ReadonlyArray<string> => section(heading, log.join("\n\n"));

export const proseOf = (sections: ReadonlyArray<ReadonlyArray<string>>): string => sections.flat().join("\n").trimEnd();
