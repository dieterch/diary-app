const DEFAULT_THRESHOLDS = {
  verylow: 40,
  low: 80,
  target: 120,
  high: 140,
  veryhigh: 210,
};

const DEFAULT_COLORS = {
  verylow: "#b33939",
  low: "#e1a32a",
  target: "#3cb371",
  high: "#25a7d9",
  veryhigh: "#6a0dad",
};

const BAND_KEYS = ["verylow", "low", "target", "high", "veryhigh"];
const THRESHOLD_KEYS = ["verylow", "low", "high", "veryhigh"];

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeColors(colors = {}) {
  return BAND_KEYS.reduce((out, key) => {
    out[key] = isHexColor(colors[key]) ? colors[key] : DEFAULT_COLORS[key];
    return out;
  }, {});
}

function normalizeThresholds(thresholds = {}) {
  const parsed = THRESHOLD_KEYS.reduce((out, key) => {
    out[key] = Number.isFinite(Number(thresholds[key]))
      ? Math.round(Number(thresholds[key]))
      : DEFAULT_THRESHOLDS[key];
    return out;
  }, {});

  parsed.verylow = Math.max(1, Math.min(parsed.verylow, 998));
  parsed.low = Math.max(parsed.verylow + 1, Math.min(parsed.low, 999));
  parsed.high = Math.max(parsed.low, Math.min(parsed.high, 1000));
  parsed.veryhigh = Math.max(parsed.high + 1, Math.min(parsed.veryhigh, 1001));

  return {
    verylow: parsed.verylow,
    low: parsed.low,
    target: Math.round((parsed.low + parsed.high) / 2),
    high: parsed.high,
    veryhigh: parsed.veryhigh,
  };
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useGlucoseBands(config = ref(null)) {
  const storedColors = useCookie("glucose-band-colors", {
    default: () => ({}),
    sameSite: "lax",
    watch: true,
  });
  const storedThresholds = useCookie("glucose-band-thresholds", {
    default: () => ({}),
    sameSite: "lax",
    watch: true,
  });

  const thresholds = computed(() => normalizeThresholds({
    ...DEFAULT_THRESHOLDS,
    ...(config.value?.glucose ?? {}),
    ...(storedThresholds.value ?? {}),
  }));

  const bandColors = computed(() => normalizeColors({
    ...(config.value?.glucose?.colors ?? {}),
    ...(storedColors.value ?? {}),
  }));

  function colorForGlucose(value) {
    if (value == null) return "transparent";

    const v = Number(value);
    const limits = thresholds.value;
    const colors = bandColors.value;

    if (v < limits.verylow) return colors.verylow;
    if (v < limits.low) return colors.low;
    if (v <= limits.high) return colors.target;
    if (v <= limits.veryhigh) return colors.high;
    return colors.veryhigh;
  }

  function bandFill(key, alpha = 0.16) {
    return hexToRgba(bandColors.value[key] ?? DEFAULT_COLORS[key], alpha);
  }

  function saveColors(colors) {
    storedColors.value = normalizeColors(colors);
  }

  function resetColors() {
    storedColors.value = {};
  }

  function saveThresholds(thresholds) {
    storedThresholds.value = normalizeThresholds(thresholds);
  }

  function resetThresholds() {
    storedThresholds.value = {};
  }

  return {
    bandKeys: BAND_KEYS,
    thresholdKeys: THRESHOLD_KEYS,
    defaultColors: DEFAULT_COLORS,
    defaultThresholds: DEFAULT_THRESHOLDS,
    thresholds,
    bandColors,
    colorForGlucose,
    bandFill,
    saveColors,
    resetColors,
    saveThresholds,
    resetThresholds,
  };
}
