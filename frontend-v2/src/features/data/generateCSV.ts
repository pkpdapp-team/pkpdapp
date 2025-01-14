import Papa from "papaparse";
import {
  DatasetRead,
  ProtocolRead,
  SubjectGroupListApiResponse,
  UnitListApiResponse,
  UnitRead,
} from "../../app/backendApi";
import { duration } from "@mui/material";

type Row = { [key: string]: any };
type Data = Row[];
type SubjectBiomarker = {
  subjectId: any;
  subjectDatasetId: number | undefined;
  time: any;
  timeUnit: UnitRead | undefined;
  value: any;
  unit: UnitRead | undefined;
  qname: string | undefined;
  label: string;
  id: number;
};

const HEADERS: string[] = [
  "ID",
  "Group",
  "Time",
  "Time Unit",
  "Observation",
  "Observation Unit",
  "Observation ID",
  "Observation Variable",
  "Administration ID",
  "Amount",
  "Amount Unit",
  "Amount Variable",
  "Infusion Duration",
  "Interdose Interval",
  "Additional Doses",
];

function parseDosingRow(
  protocol: ProtocolRead,
  units: UnitListApiResponse | undefined,
  groupId: string | undefined,
  adminId: number,
) {
  const amountUnit =
    units?.find((unit) => unit.id === protocol.amount_unit)?.symbol || "";
  const timeUnit =
    units?.find((unit) => unit.id === protocol.time_unit)?.symbol || "";
  const qname = protocol.mapped_qname;
  return protocol.doses.map((dose) => ({
    "Administration ID": adminId,
    Group: groupId,
    Amount: dose.amount.toString(),
    "Amount Unit": amountUnit,
    Time: dose.start_time.toString(),
    "Time Unit": timeUnit,
    "Infusion Duration": dose.duration,
    "Additional Doses": (dose?.repeats || 1) - 1,
    "Interdose Interval": dose.repeat_interval,
    "Amount Variable": qname,
    Observation: ".",
  }));
}

function parseBiomarkerRow(
  row: SubjectBiomarker,
  groupId: string | undefined,
): Row {
  return {
    ID: row.subjectDatasetId,
    Time: row.time.toString(),
    "Time Unit": row.timeUnit?.symbol,
    Observation: row.value.toString(),
    "Observation Unit": row.unit?.symbol,
    "Observation ID": row.label,
    "Observation Variable": row.qname,
    Group: groupId,
    Amount: ".",
  };
}

export default function generateCSV(
  dataset: DatasetRead | undefined,
  groups: SubjectGroupListApiResponse,
  subjectBiomarkers: SubjectBiomarker[][] | undefined,
  units: UnitListApiResponse | undefined,
  format: "default" | "nonmem",
) {
  const rows: Data = [];
  groups.forEach((group, groupIndex) => {
    const groupId = group?.id_in_dataset || group?.name;

    const dosingRows: Row[] = group.protocols.flatMap(
      (protocol, protocolIndex) => {
        const adminId = groupIndex + 1 + protocolIndex;
        return parseDosingRow(protocol, units, groupId, adminId);
      },
    );

    const observationRows: Row[] = (subjectBiomarkers || [])
      .flatMap((biomarkerRows) =>
        biomarkerRows.map((row) => {
          const group = dataset?.groups?.find((group) =>
            group.subjects.includes(row.subjectId),
          );
          const groupId = group?.id_in_dataset || group?.name;
          return parseBiomarkerRow(row, groupId);
        }),
      )
      .filter((row: Row) => row.Group === groupId);

    const subjects = new Set(observationRows?.map((row: Row) => row["ID"]));
    subjects.forEach((subjectId) => {
      const subjectObservations = observationRows
        ? observationRows.filter((row: Row) => row["ID"] === subjectId)
        : [];
      const subjectDosing: Row[] = dosingRows
        .filter((row) => row.Group === groupId)
        .map((row) => ({ ...row, ID: subjectId }));
      subjectDosing.concat(subjectObservations).forEach((observation: Row) => {
        const dataRow: Row = {};
        HEADERS.forEach((header) => {
          dataRow[header] = observation[header];
        });
        rows.push(dataRow);
      });
    });
  });
  if (format === "nonmem") {
    nonMemModifier(rows);
  }
  return Papa.unparse(rows);
}
const NONMEM_HEADER_MAPPING: { [key: string]: string } = {
  Time: "TIME",
  Observation: "DV",
  "Administration ID": "CMT",
  Amount: "AMT",
  "Interdose Interval": "II",
  "Additional Doses": "ADDL",
};

function nonMemModifier(rows: Data) {
  rows.forEach((row) => {
    // add MDV and EVID columns
    if (row["Observation"] === ".") {
      row["MDV"] = 0;
      row["EVID"] = 0;
    } else {
      row["MDV"] = 1;
      row["EVID"] = 1;
    }

    // RATE column
    if (
      "Infusion Duration" in row &&
      "Amount" in row &&
      row["Infusion Duration"] !== undefined &&
      row["Amount"] !== undefined
    ) {
      const duration = row["Infusion Duration"];
      const amount = row["Amount"];
      const rate = amount / duration;
      row["RATE"] = rate;
      delete row["Infusion Duration"];
    } else {
      row["RATE"] = ".";
    }

    // all empty values should be replaced with "."
    HEADERS.forEach((key) => {
      if (!(key in row)) {
        row[key] = ".";
      }
      if (row[key] === "" || row[key] === undefined) {
        row[key] = ".";
      }
    });

    // rename columns
    Object.keys(NONMEM_HEADER_MAPPING).forEach((key) => {
      const value = row[key];
      const new_key = NONMEM_HEADER_MAPPING[key];
      row[new_key] = value;
      delete row[key];
    });
  });
}
