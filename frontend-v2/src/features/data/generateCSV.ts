import Papa from "papaparse";
import {
  DatasetRead,
  ProtocolRead,
  SubjectGroupListApiResponse,
  UnitListApiResponse,
  UnitRead,
} from "../../app/backendApi";

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
  "Time_unit",
  "Observation",
  "Observation_unit",
  "Observation_id",
  "Observation_var",
  "Adm",
  "Amt",
  "Amt_unit",
  "Amt_var",
  "Infusion_time",
  "II",
  "ADDL",
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
    Adm: adminId,
    Group: groupId,
    Amt: dose.amount.toString(),
    Amt_unit: amountUnit,
    Time: dose.start_time.toString(),
    Time_unit: timeUnit,
    Infusion_time: dose.duration,
    ADDL: (dose?.repeats || 1) - 1,
    II: dose.repeat_interval,
    Amt_var: qname,
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
    Time_unit: row.timeUnit?.symbol,
    Observation: row.value.toString(),
    Observation_unit: row.unit?.symbol,
    Observation_id: row.label,
    Observation_var: row.qname,
    Group: groupId,
    Amt: ".",
  };
}

export default function generateCSV(
  dataset: DatasetRead | undefined,
  groups: SubjectGroupListApiResponse,
  subjectBiomarkers: SubjectBiomarker[][] | undefined,
  units: UnitListApiResponse | undefined,
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
  return Papa.unparse(rows);
}
