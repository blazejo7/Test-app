import type { ThemeColors } from '@/constants/theme';
import type { InspectionResult, RotaStatus, VanStatus } from '@/types/database';

/** Theme-aware colors for the various status enums (mirrors the badge logic). */

export function vanStatusColor(c: ThemeColors, status: VanStatus): string {
  return status === 'grounded' ? c.danger : status === 'new_damage' ? c.warning : c.success;
}

export function resultColor(c: ThemeColors, result: InspectionResult): string {
  return result === 'grounded' ? c.danger : result === 'new_damage' ? c.warning : c.success;
}

export function rotaStatusColor(c: ThemeColors, status: RotaStatus | 'unset'): string {
  return status === 'available' ? c.success : status === 'assigned' ? c.primary : c.textSecondary;
}
