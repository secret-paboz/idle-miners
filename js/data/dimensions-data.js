// ============================================================
// DIMENSIONS-DATA.JS — Dimension unlock table & multipliers
// icon: Font Awesome 6 Free class string
// ============================================================

export const DIMENSIONS = [
  {
    id:           "earth",
    name:         "Earth",
    icon:         "fa-solid fa-globe",
    unlockAt:     0,
    valueMulti:   1.0,
    description:  "Where every miner begins. Familiar, humble, honest.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      accentColor:   "#4caf50",
      particleColor: "#4caf50",
      skyColor:      "#1a1a2e",
    },
    unlockMessage: "Your journey begins beneath the earth.",
  },
  {
    id:           "cave",
    name:         "Deep Cave",
    icon:         "fa-solid fa-mountain",
    unlockAt:     3,
    valueMulti:   2.5,
    description:  "Ancient caverns untouched by sunlight. Ore worth 2.5x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #0d0d0d 0%, #1a0a00 50%, #2d1200 100%)",
      accentColor:   "#ff6f00",
      particleColor: "#ff6f00",
      skyColor:      "#0d0d0d",
    },
    unlockMessage: "You descend into eternal darkness. The ore glows faintly.",
  },
  {
    id:           "snow",
    name:         "Snow Dimension",
    icon:         "fa-solid fa-snowflake",
    unlockAt:     6,
    valueMulti:   5.0,
    description:  "A frozen world where minerals crystallize. Ore worth 5x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #e0f7fa 0%, #b2ebf2 30%, #1a237e 100%)",
      accentColor:   "#80deea",
      particleColor: "#ffffff",
      skyColor:      "#e0f7fa",
    },
    unlockMessage: "The air bites cold. Frozen ore sparkles like stars.",
  },
  {
    id:           "nether",
    name:         "Nether",
    icon:         "fa-solid fa-fire",
    unlockAt:     9,
    valueMulti:   10.0,
    description:  "A hellish realm of fire and ash. Ore worth 10x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #3e0000 0%, #7f0000 40%, #b71c1c 100%)",
      accentColor:   "#ff1744",
      particleColor: "#ff6d00",
      skyColor:      "#3e0000",
    },
    unlockMessage: "Heat waves distort the air. Everything glows red.",
  },
  {
    id:           "crimson",
    name:         "Crimson Forest",
    icon:         "fa-solid fa-leaf",
    unlockAt:     12,
    valueMulti:   18.0,
    description:  "Fungal spires of deep crimson. Ore worth 18x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #4a0010 0%, #880e4f 40%, #c2185b 100%)",
      accentColor:   "#f48fb1",
      particleColor: "#f06292",
      skyColor:      "#4a0010",
    },
    unlockMessage: "Strange fungi tower overhead. The ground throbs.",
  },
  {
    id:           "warped",
    name:         "Warped Forest",
    icon:         "fa-solid fa-wind",
    unlockAt:     15,
    valueMulti:   30.0,
    description:  "Twisted teal reality. Ore worth 30x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #00251a 0%, #004d40 40%, #00695c 100%)",
      accentColor:   "#1de9b6",
      particleColor: "#64ffda",
      skyColor:      "#00251a",
    },
    unlockMessage: "Reality bends. Teal spores drift endlessly upward.",
  },
  {
    id:           "end",
    name:         "The End",
    icon:         "fa-solid fa-star",
    unlockAt:     18,
    valueMulti:   50.0,
    description:  "Void islands floating in nothing. Ore worth 50x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #0d0016 0%, #1a0033 40%, #12005e 100%)",
      accentColor:   "#ea80fc",
      particleColor: "#ce93d8",
      skyColor:      "#0d0016",
    },
    unlockMessage: "Stars. Silence. Endermen stare. Ore shimmers purple.",
  },
  {
    id:           "void",
    name:         "The Void",
    icon:         "fa-solid fa-circle-dot",
    unlockAt:     21,
    valueMulti:   80.0,
    description:  "Absolute nothingness. Ore worth 80x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #000000 0%, #050005 50%, #0a000f 100%)",
      accentColor:   "#7c4dff",
      particleColor: "#651fff",
      skyColor:      "#000000",
    },
    unlockMessage: "Nothing exists here. Yet ore materializes from pure dark.",
  },
  {
    id:           "aether",
    name:         "The Aether",
    icon:         "fa-solid fa-cloud",
    unlockAt:     24,
    valueMulti:   150.0,
    description:  "A heavenly realm above the clouds. Ore worth 150x more.",
    theme: {
      bgGradient:    "linear-gradient(180deg, #e8f5e9 0%, #fff9c4 30%, #fffde7 100%)",
      accentColor:   "#ffca28",
      particleColor: "#fff176",
      skyColor:      "#e8f5e9",
    },
    unlockMessage: "You ascend beyond everything. Golden light bathes the ore.",
  },
];

export function getDimension(dimensionId) {
  return DIMENSIONS.find(d => d.id === dimensionId) || DIMENSIONS[0];
}

export function getUnlockedDimensions(rebirths) {
  return DIMENSIONS.filter(d => rebirths >= d.unlockAt);
}

export function getLatestDimension(rebirths) {
  const unlocked = getUnlockedDimensions(rebirths);
  return unlocked[unlocked.length - 1] || DIMENSIONS[0];
}

export function getNextDimension(rebirths) {
  return DIMENSIONS.find(d => d.unlockAt > rebirths) || null;
}

export function rebirthsUntilNextDimension(rebirths) {
  const next = getNextDimension(rebirths);
  if (!next) return null;
  return next.unlockAt - rebirths;
}
