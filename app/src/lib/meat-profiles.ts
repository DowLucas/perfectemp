// Pathogen thermal inactivation kinetics from peer-reviewed meat-matrix studies
// All D-values at T_ref, z-values in °C

export interface PathogenKinetics {
  id: string
  name: string
  tRefC: number
  dRefMin: number
  zC: number
}

export const PATHOGENS: Record<string, PathogenKinetics> = {
  salmonella_beef: {
    id: 'salmonella_beef',
    name: 'Salmonella (beef)',
    tRefC: 60.0,
    dRefMin: 2.03,  // [Hassan-2023] whole-muscle
    zC: 3.94,
  },
  salmonella_beef_ground: {
    id: 'salmonella_beef_ground',
    name: 'Salmonella (ground beef)',
    tRefC: 60.0,
    dRefMin: 3.5,   // [Murphy-2004]
    zC: 5.74,
  },
  salmonella_chicken: {
    id: 'salmonella_chicken',
    name: 'Salmonella (chicken)',
    tRefC: 60.0,
    dRefMin: 4.68,  // [OBryan-2006, via Baldwin]
    zC: 6.45,
  },
  salmonella_pork: {
    id: 'salmonella_pork',
    name: 'Salmonella (pork)',
    tRefC: 60.0,
    dRefMin: 3.5,   // [Juneja-2001a]
    zC: 5.7,
  },
  listeria_beef: {
    id: 'listeria_beef',
    name: 'L. monocytogenes (beef)',
    tRefC: 60.0,
    dRefMin: 6.1,   // [Murphy-2004]
    zC: 6.01,
  },
  listeria_chicken: {
    id: 'listeria_chicken',
    name: 'L. monocytogenes (chicken)',
    tRefC: 60.0,
    dRefMin: 5.94,  // [OBryan-2006, via Baldwin]
    zC: 5.66,
  },
  ecoli_o157h7: {
    id: 'ecoli_o157h7',
    name: 'E. coli O157:H7',
    tRefC: 60.0,
    dRefMin: 3.17,  // [Juneja-1997] lean ground beef
    zC: 6.0,
  },
}

export interface DonenessLevel {
  id: string
  label: string
  targetCoreC: number
  textureWindowC: [number, number]
  minLogReduction: Record<string, number>
}

export type CutClass = 'whole_muscle' | 'ground' | 'tough_cut' | 'poultry' | 'fish'
export type GeometryShape = 'slab' | 'cylinder' | 'sphere'
export type CookMethod = 'oven' | 'pan' | 'grill' | 'sous_vide' | 'smoker' | 'braise'

export interface MeatProfile {
  id: string
  label: string
  cutClass: CutClass
  surfaceContaminatedOnly: boolean
  pathogenIds: string[]
  doneness: DonenessLevel[]
  diffusivityM2S: number
  geometryShape: GeometryShape
  defaultThicknessM: number
}

export const MEAT_PROFILES: MeatProfile[] = [
  // ── Beef ───────────────────────────────────────────────
  {
    id: 'beef_steak',
    label: 'Beef Steak',
    cutClass: 'whole_muscle',
    surfaceContaminatedOnly: true,
    pathogenIds: ['salmonella_beef', 'ecoli_o157h7'],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.035,
    doneness: [
      { id: 'rare', label: 'Rare', targetCoreC: 52, textureWindowC: [50, 54], minLogReduction: {} },
      { id: 'medium_rare', label: 'Medium Rare', targetCoreC: 55, textureWindowC: [54, 57], minLogReduction: {} },
      { id: 'medium', label: 'Medium', targetCoreC: 60, textureWindowC: [58, 63], minLogReduction: {} },
      { id: 'medium_well', label: 'Medium Well', targetCoreC: 65, textureWindowC: [63, 68], minLogReduction: {} },
      { id: 'well', label: 'Well Done', targetCoreC: 71, textureWindowC: [70, 74], minLogReduction: {} },
    ],
  },
  {
    id: 'beef_roast',
    label: 'Beef Roast',
    cutClass: 'whole_muscle',
    surfaceContaminatedOnly: true,
    pathogenIds: ['salmonella_beef'],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'cylinder',
    defaultThicknessM: 0.08,
    doneness: [
      { id: 'rare', label: 'Rare', targetCoreC: 52, textureWindowC: [50, 54], minLogReduction: {} },
      { id: 'medium_rare', label: 'Medium Rare', targetCoreC: 55, textureWindowC: [54, 57], minLogReduction: {} },
      { id: 'medium', label: 'Medium', targetCoreC: 60, textureWindowC: [58, 63], minLogReduction: {} },
    ],
  },
  {
    id: 'beef_ground',
    label: 'Ground Beef',
    cutClass: 'ground',
    surfaceContaminatedOnly: false,
    pathogenIds: ['salmonella_beef_ground', 'ecoli_o157h7'],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.02,
    doneness: [
      { id: 'medium', label: 'Medium', targetCoreC: 63, textureWindowC: [60, 66], minLogReduction: { salmonella_beef_ground: 6.5, ecoli_o157h7: 5.0 } },
      { id: 'well', label: 'Well Done', targetCoreC: 71, textureWindowC: [70, 74], minLogReduction: { salmonella_beef_ground: 6.5, ecoli_o157h7: 5.0 } },
    ],
  },

  // ── Pork ───────────────────────────────────────────────
  {
    id: 'pork_chop',
    label: 'Pork Chop',
    cutClass: 'whole_muscle',
    surfaceContaminatedOnly: true,
    pathogenIds: ['salmonella_pork'],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.03,
    doneness: [
      { id: 'medium', label: 'Medium', targetCoreC: 63, textureWindowC: [60, 66], minLogReduction: {} },
      { id: 'medium_well', label: 'Medium Well', targetCoreC: 66, textureWindowC: [64, 69], minLogReduction: {} },
      { id: 'well', label: 'Well Done', targetCoreC: 71, textureWindowC: [70, 74], minLogReduction: {} },
    ],
  },
  {
    id: 'pork_roast',
    label: 'Pork Roast',
    cutClass: 'whole_muscle',
    surfaceContaminatedOnly: true,
    pathogenIds: ['salmonella_pork'],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'cylinder',
    defaultThicknessM: 0.07,
    doneness: [
      { id: 'medium', label: 'Medium', targetCoreC: 63, textureWindowC: [60, 66], minLogReduction: {} },
      { id: 'well', label: 'Well Done', targetCoreC: 71, textureWindowC: [70, 74], minLogReduction: {} },
    ],
  },

  // ── Poultry ────────────────────────────────────────────
  {
    id: 'chicken_breast',
    label: 'Chicken Breast',
    cutClass: 'poultry',
    surfaceContaminatedOnly: false,
    pathogenIds: ['salmonella_chicken', 'listeria_chicken'],
    diffusivityM2S: 1.35e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.035,
    doneness: [
      { id: 'juicy', label: 'Juicy (60°C hold)', targetCoreC: 60, textureWindowC: [58, 63], minLogReduction: { salmonella_chicken: 7.0, listeria_chicken: 7.0 } },
      { id: 'standard', label: 'Standard', targetCoreC: 74, textureWindowC: [72, 77], minLogReduction: { salmonella_chicken: 7.0, listeria_chicken: 7.0 } },
    ],
  },
  {
    id: 'chicken_thigh',
    label: 'Chicken Thigh',
    cutClass: 'poultry',
    surfaceContaminatedOnly: false,
    pathogenIds: ['salmonella_chicken'],
    diffusivityM2S: 1.35e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.025,
    doneness: [
      { id: 'standard', label: 'Standard', targetCoreC: 74, textureWindowC: [72, 77], minLogReduction: { salmonella_chicken: 7.0 } },
      { id: 'tender', label: 'Tender', targetCoreC: 82, textureWindowC: [80, 85], minLogReduction: { salmonella_chicken: 7.0 } },
    ],
  },

  // ── Lamb ───────────────────────────────────────────────
  {
    id: 'lamb_chop',
    label: 'Lamb Chop',
    cutClass: 'whole_muscle',
    surfaceContaminatedOnly: true,
    pathogenIds: ['salmonella_beef'], // closest kinetics
    diffusivityM2S: 1.3e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.03,
    doneness: [
      { id: 'rare', label: 'Rare', targetCoreC: 54, textureWindowC: [52, 56], minLogReduction: {} },
      { id: 'medium_rare', label: 'Medium Rare', targetCoreC: 57, textureWindowC: [55, 59], minLogReduction: {} },
      { id: 'medium', label: 'Medium', targetCoreC: 63, textureWindowC: [61, 66], minLogReduction: {} },
      { id: 'well', label: 'Well Done', targetCoreC: 71, textureWindowC: [70, 74], minLogReduction: {} },
    ],
  },

  // ── Fish ───────────────────────────────────────────────
  {
    id: 'salmon',
    label: 'Salmon',
    cutClass: 'fish',
    surfaceContaminatedOnly: true,
    pathogenIds: [],
    diffusivityM2S: 1.3e-7,
    geometryShape: 'slab',
    defaultThicknessM: 0.025,
    doneness: [
      { id: 'rare', label: 'Rare (sushi grade)', targetCoreC: 42, textureWindowC: [40, 45], minLogReduction: {} },
      { id: 'medium_rare', label: 'Medium Rare', targetCoreC: 48, textureWindowC: [46, 50], minLogReduction: {} },
      { id: 'medium', label: 'Medium', targetCoreC: 52, textureWindowC: [50, 55], minLogReduction: {} },
      { id: 'well', label: 'Well Done', targetCoreC: 60, textureWindowC: [58, 63], minLogReduction: {} },
    ],
  },
]

export function getProfile(id: string): MeatProfile | undefined {
  return MEAT_PROFILES.find((p) => p.id === id)
}

export function getPathogen(id: string): PathogenKinetics | undefined {
  return PATHOGENS[id]
}
