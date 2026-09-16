const clothingSizes = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "4XL", "5XL", "6XL"];
const sizeText = (value: unknown) => String(value ?? "").trim();
const normalizeSizeText = (value: unknown) => sizeText(value).toUpperCase().replace(/[–—]/g, "-").replace(/\s+/g, "");

const parseAgeSize = (value: unknown) => {
    const normalized = normalizeSizeText(value);
    const match = normalized.match(/^(\d+(?:\.\d+)?)(MONTHS?|MOS?|M|YEARS?|YRS?|YR|Y)?(?:(?:TO|-)(\d+(?:\.\d+)?)(MONTHS?|MOS?|M|YEARS?|YRS?|YR|Y)?)?$/);
    if (!match || (!match[2] && !match[4])) return null;
    const start = Number(match[1]);
    const end = match[3] === undefined ? start : Number(match[3]);
    const startUnit = (match[2] || match[4]).startsWith("Y") ? "year" : "month";
    const endUnit = (match[4] || match[2]).startsWith("Y") ? "year" : "month";
    const startMonths = start * (startUnit === "year" ? 12 : 1);
    const endMonths = end * (endUnit === "year" ? 12 : 1);
    if (endMonths < startMonths) return null;
    return { start, end, startUnit, endUnit, startMonths, endMonths, range: match[3] !== undefined };
};

const sizeKey = (value: unknown): number[] => {
    const normalized = normalizeSizeText(value);
    const clothing = normalized.replace(/^2XL$/, "XXL").replace(/^3XL$/, "XXXL");
    const index = clothingSizes.indexOf(clothing);
    if (index >= 0) return [0, index, 0];
    if (/^\d+(?:\.\d+)?$/.test(normalized)) return [1, Number(normalized), 0];
    const age = parseAgeSize(value);
    if (age) return [2, age.startMonths, age.endMonths];
    return [3, 0, 0];
};

export const compareSizes = (first: unknown, second: unknown): number => {
    const a = sizeKey(first);
    const b = sizeKey(second);
    for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) return a[index] - b[index];
    }
    return sizeText(first).localeCompare(sizeText(second), "en", { numeric: true, sensitivity: "base" });
};

export const formatSizeLabel = (value: unknown): string => {
    const age = parseAgeSize(value);
    if (!age) return sizeText(value);
    const unitLabel = (unit: string, count: number) => unit === "year" ? (count === 1 ? "Year" : "Years") : (count === 1 ? "Month" : "Months");
    if (!age.range) return `${age.start} ${unitLabel(age.startUnit, age.start)}`;
    if (age.startUnit === age.endUnit) return `${age.start} to ${age.end} ${unitLabel(age.endUnit, age.end)}`;
    return `${age.start} ${unitLabel(age.startUnit, age.start)} to ${age.end} ${unitLabel(age.endUnit, age.end)}`;
};
