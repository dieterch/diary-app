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

function isHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeColors(colors = {}) {
  return BAND_KEYS.reduce((out, key) => {
    out[key] = isHexColor(colors[key]) ? colors[key] : DEFAULT_COLORS[key];
    return out;
  }, {});
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

  const thresholds = computed(() => ({
    ...DEFAULT_THRESHOLDS,
    ...(config.value?.glucose ?? {}),
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

  return {
    bandKeys: BAND_KEYS,
    defaultColors: DEFAULT_COLORS,
    thresholds,
    bandColors,
    colorForGlucose,
    bandFill,
    saveColors,
    resetColors,
  };
}
