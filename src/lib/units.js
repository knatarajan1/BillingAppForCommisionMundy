export const UNIT_VALUES = ['Kg', 'Ton', 'Box', 'Bag', 'Pcs']

export const UNIT_KEY_MAP = {
  Kg:  'unit.kg',
  Ton: 'unit.ton',
  Box: 'unit.box',
  Bag: 'unit.bag',
  Pcs: 'unit.pcs',
}

export function getUnitOptions(t) {
  return UNIT_VALUES.map(v => ({ value: v, label: t(UNIT_KEY_MAP[v]) }))
}

export function getUnitLabel(unit, t) {
  const key = UNIT_KEY_MAP[unit]
  return key ? t(key) : (unit || '')
}
