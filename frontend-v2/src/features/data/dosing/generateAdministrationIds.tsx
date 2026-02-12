import { Row } from "../LoadData";

/**
 * Assign an administration ID to each dosing row based on the dosing compartment and group ID.
 * @param dosingRows
 * @param administrationIdField
 * @param groupIdField
 * @returns an array of modified dosing rows.
 */

export function generateAdministrationIds(
  dosingRows: Row[],
  administrationIdField: string,
  groupIdField: string,
) {
  const dosingCompartments = [
    ...new Set(dosingRows.map((row) => row["Amount Variable"])),
  ];
  const uniqueGroupIds = [
    ...new Set(dosingRows.map((row) => row[groupIdField])),
  ];
  const administrationIds: string[] = [];
  dosingRows.forEach((row) => {
    const groupIndex = uniqueGroupIds.indexOf(row[groupIdField]) + 1;
    const compartmentIndex = dosingCompartments.indexOf(row["Amount Variable"]);
    const adminId = `${compartmentIndex * 10 + groupIndex}`;
    if (row[administrationIdField] !== adminId) {
      row[administrationIdField] = adminId;
    }
    administrationIds.push(adminId);
  });
  return dosingRows;
}
