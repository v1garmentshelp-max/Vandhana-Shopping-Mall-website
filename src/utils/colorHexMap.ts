const COLOR_HEX_BY_NAME: Record<string, string> = {
  "LT PURPLE": "#6B214F",
  "LIGHT PURPLE": "#6B214F",
  RED: "#BE1028",
  "APPLE RED": "#A60D25",
  APPLERED: "#A60D25",
  "CRIMSON RED": "#A5122F",
  LAVANDER: "#C8BED7",
  LAVENDER: "#C8BED7",
  "DK LAVANDER": "#8572B2",
  "DARK LAVANDER": "#8572B2",
  "DARK LAVENDER": "#8572B2",
  PAPAYA: "#E64821",
  ORANGE: "#F07B18",
  CORAL: "#C63D5E",
  "LEMON YELLOW": "#D8C400",
  LEMON: "#D8C400",
  GOLD: "#C7AF00",
  TANGO: "#E58A00",
  PISTA: "#A5B35A",
  FERN: "#7A8E1E",
  MOJITO: "#2AAE8A",
  "CHILLY GREEN": "#0B7A3A",
  "CHILLI GREEN": "#0B7A3A",
  "BOTTLE GREEN": "#062A1F",
  "RAMA GREEN": "#1C7E77",
  NAVY: "#11172D",
  "NAVY BLUE": "#11172D",
  "INK BLUE": "#232451",
  HONEY: "#B59643",
  "DEEP SKIN": "#B7A47D",
  SAND: "#C7BA99",
  CREAM: "#EFE6C7",
  "CHERRY BROWN": "#4D1817",
  CHERRYBROWN: "#4D1817",
  "FRENCH WINE": "#5A1725",
  FRENCHWINE: "#5A1725",
  SLATE: "#454A53",
  FOREST: "#183F18",
  "FOREST GREEN": "#183F18",
  MUSTARD: "#B97A12",
  "PEACOCK GREEN": "#0F6D73",
  "ICE GREEN": "#A7E0D5",
  "AQUA MARINE": "#3D9DB3",
  AQUAMARINE: "#3D9DB3",
  "DUSKY PINK": "#C28D97",
  MAUVE: "#91626C",
  SUNSET: "#D97A68",
  BANANA: "#E7D600",
  STRAWBERRY: "#C61A6A",
  MAGENTA: "#B61065",
  "RANI PINK": "#CD2E7D",
  LOTUS: "#CB538B",
  PINK: "#B0818E",
  FUSHIA: "#894A6E",
  FUCHSIA: "#894A6E",
  VOILET: "#6D297F",
  VIOLET: "#6D297F",
  PLUM: "#701C67",
  ORCHID: "#442165",
  "DEEP ORCHID": "#5C2B8C",
  SPICE: "#BC6D41",
  PEACH: "#E7B2B2",
  MANGO: "#CC9E02",
  APRICOT: "#AB9F02",
  "GRASS GREEN": "#75C602",
  "PARROT GREEN": "#03A504",
  CATERPILLAR: "#A8B42D",
  "LIME GREEN": "#C7D39E",
  TURQUOISE: "#01899E",
  "MARINE BLUE": "#0263AC",
  "PEACOCK BLUE": "#037FBE",
  "AQUA BLUE": "#03B3D2",
  "JEANS BLUE": "#6783A4",
  "ROYAL BLUE": "#A5B0C8",
  WHITE: "#BFC4C6",
  BLACK: "#62686E",
  GREY: "#A2A7AE",
  GRAY: "#A2A7AE",
  "ANTHRA MELANGE": "#9BA1A7",
  CHOCOLATE: "#C8CBCF",
  BROWN: "#CCD1D6",
  NUDE: "#B1B8BC",
  LIMESTONE: "#B2B8BC",
  BUTTERNUT: "#C6CBCF",
  CEMENT: "#D4D9DE",
  "ORANGE PEACH": "#D2D6DA",
  "TEA GREEN": "#CFD2D7",
  INDIGO: "#9EA3A6",
  MAROON: "#800000",
  BURGUNDY: "#800020",
  BEIGE: "#D8C3A5",
  IVORY: "#FFFFF0",
  "OFF WHITE": "#FAF9F6",
  SILVER: "#C0C0C0",
  CHARCOAL: "#36454F",
  BLUE: "#2563EB",
  "DARK BLUE": "#1E3A8A",
  "LIGHT BLUE": "#ADD8E6",
  "SKY BLUE": "#87CEEB",
  TEAL: "#008080",
  GREEN: "#16A34A",
  "DARK GREEN": "#14532D",
  "LIGHT GREEN": "#90EE90",
  OLIVE: "#808000",
  "OLIVE GREEN": "#556B2F",
  MINT: "#98FF98",
  YELLOW: "#EAB308",
  PURPLE: "#7E22CE",
  LILAC: "#C8A2C8"
};

const FB_HEX: Record<string, string> = {
  "101": "#C61A6A",
  "102": "#B61065",
  "103": "#CD2E7D",
  "104": "#CB538B",
  "105": "#B0818E",
  "106": "#894A6E",
  "113": "#6D297F",
  "114": "#701C67",
  "115": "#442165",
  "116": "#5C2B8C",
  "117": "#BC6D41",
  "118": "#E7B2B2",
  "125": "#CC9E02",
  "126": "#AB9F02",
  "127": "#75C602",
  "128": "#03A504",
  "129": "#A8B42D",
  "130": "#C7D39E",
  "137": "#01899E",
  "138": "#0263AC",
  "139": "#037FBE",
  "140": "#03B3D2",
  "141": "#6783A4",
  "142": "#A5B0C8",
  "149": "#BFC4C6",
  "150": "#62686E",
  "151": "#A2A7AE",
  "152": "#9BA1A7",
  "153": "#C8CBCF",
  "154": "#CCD1D6",
  "161": "#B1B8BC",
  "162": "#B2B8BC",
  "163": "#C6CBCF",
  "164": "#D4D9DE",
  "165": "#D2D6DA",
  "166": "#CFD2D7",
  "173": "#9EA3A6"
};

export const normalizeColorName = (value: unknown) =>
  String(value ?? "")
    .toUpperCase()
    .replace(/\(\s*FB\s*#?\s*\d+\s*\)/gi, " ")
    .replace(/FB\s*#?\s*\d+/gi, " ")
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const resolveColorHex = (value: unknown, provided?: unknown) => {
  const supplied = String(provided ?? "").trim();

  if (/^#([0-9A-F]{3}|[0-9A-F]{6}|[0-9A-F]{8})$/i.test(supplied)) {
    return supplied.toUpperCase();
  }

  const raw = String(value ?? "");
  const fbMatch = raw.match(/FB\s*#?\s*(\d+)/i);

  if (fbMatch && FB_HEX[fbMatch[1]]) {
    return FB_HEX[fbMatch[1]];
  }

  const normalized = normalizeColorName(raw);

  if (COLOR_HEX_BY_NAME[normalized]) {
    return COLOR_HEX_BY_NAME[normalized];
  }

  const directMatch = Object.keys(COLOR_HEX_BY_NAME)
    .sort((first, second) => second.length - first.length)
    .find(name => normalized.includes(name));

  return directMatch ? COLOR_HEX_BY_NAME[directMatch] : "#D1D5DB";
};

export const resolveColorStyle = (value: unknown, provided?: unknown) => {
  const normalized = normalizeColorName(value);

  if (
    normalized.includes("MULTI") ||
    normalized.includes("RAINBOW") ||
    normalized.includes("ASSORTED")
  ) {
    return "conic-gradient(#EF4444,#F59E0B,#EAB308,#22C55E,#06B6D4,#3B82F6,#8B5CF6,#EC4899,#EF4444)";
  }

  return resolveColorHex(value, provided);
};
