export const getLabel = (label: string, isRequired: boolean): string => {
  if (!label) return "";

  return isRequired ? `${label}*` : label;
};
