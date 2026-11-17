import { currentSettings, DEF } from "./calc.js";

const hasValue = (value) => value !== "" && value !== null && value !== undefined;

export const mergeTemporarySettings = (settings, overrides = {}) => ({
  ...currentSettings(settings),
  ...Object.fromEntries(
    Object.entries(overrides)
      .filter(([key, value]) => Object.prototype.hasOwnProperty.call(DEF, key) && hasValue(value) && Number.isFinite(Number(value)))
      .map(([key, value]) => [key, Number(value)]),
  ),
});

export const resolveInternalDutyRate = (manualDuty, overrides = {}) => {
  if (hasValue(overrides.duty) && Number.isFinite(Number(overrides.duty))) {
    return Number(overrides.duty);
  }
  if (hasValue(manualDuty) && Number.isFinite(Number(manualDuty))) {
    return Number(manualDuty);
  }
  return null;
};
