const hasValue = (value) => value !== "" && value !== null && value !== undefined;

export const mergeTemporarySettings = (settings, overrides = {}) => ({
  ...settings,
  ...Object.fromEntries(
    Object.entries(overrides)
      .filter(([, value]) => hasValue(value) && Number.isFinite(Number(value)))
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
