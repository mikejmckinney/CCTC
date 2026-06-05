import currentBlueprintJson from '../../blueprints/cctc-from-2026-07.json';
import legacyBlueprintJson from '../../blueprints/cctc-thru-2026-06.json';
import type { Blueprint, BlueprintId, CurrentBlueprint, LegacyBlueprint } from '../types/exam';

export const CURRENT_BLUEPRINT = currentBlueprintJson as CurrentBlueprint;
export const LEGACY_BLUEPRINT = legacyBlueprintJson as LegacyBlueprint;

export const BLUEPRINTS: Record<BlueprintId, Blueprint> = {
  'cctc-from-2026-07': CURRENT_BLUEPRINT,
  'cctc-thru-2026-06': LEGACY_BLUEPRINT
};

export function getBlueprint(blueprintId: BlueprintId): Blueprint {
  return BLUEPRINTS[blueprintId];
}

export function getBlueprintLabel(blueprintId: BlueprintId): string {
  return BLUEPRINTS[blueprintId].label;
}