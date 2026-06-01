import { useRef } from "react";
import { Row } from "../LoadData";

export function useUniqueDosingRows(
  dosingRows: Row[],
  doseGroupingFields: string[],
  dosingRowKeyField: string,
): Row[] {
  const nextDosingRowKey = useRef(0);
  const uniqueDosingRows = dosingRows.filter(
    (row, index, arr) =>
      doseGroupingFields.length === 0 ||
      arr.findIndex((r) =>
        doseGroupingFields.every((field) => r[field] === row[field]),
      ) === index,
  );
  return uniqueDosingRows.map((row) => {
    if (row[dosingRowKeyField]) {
      return row;
    }
    row[dosingRowKeyField] = `dosing-row-${nextDosingRowKey.current}`;
    nextDosingRowKey.current += 1;
    return row;
  });
}
