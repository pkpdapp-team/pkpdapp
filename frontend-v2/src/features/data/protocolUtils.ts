import { StepperState } from "./LoadDataStepper";
import { parsePerKgDoses } from "./dataValidation";

export interface IDose {
  subject: string;
  amount: number;
  amountUnit?: string;
  perBodyWeight?: string;
  label: string;
  route?: string;
  time?: number;
  timeUnit?: string;
}

export type SubjectDoses = IDose[];

export interface IProtocol {
  label: string;
  doses: IDose[];
  subjects: string[];
}

export function getSubjectDoses(state: StepperState): SubjectDoses[] {
  const idField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "ID",
  );
  const amountField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Amount",
  );
  const amountUnitField = state.fields.find((field) =>
    ["Amount Unit", "Unit"].includes(state.normalisedFields.get(field) || ""),
  );
  const timeField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Time",
  );
  const timeUnitField = state.fields.find(
    (field) => state.normalisedFields.get(field) === "Time Unit",
  );
  const routeField = state.fields.find(
    (field) => field.toLowerCase() === "route",
  );
  const { data: perKgData = [], normalisedFields = new Map() } =
    parsePerKgDoses(state);
  const subjectIds = perKgData.map((row) => idField && row[idField]);
  const perKgFields = Array.from(normalisedFields.keys());
  const perBodyWeightField = perKgFields.find(
    (field) => normalisedFields.get(field) === "Per Body Weight(kg)",
  );
  const uniqueSubjectIds = [...new Set(subjectIds)];
  const subjectDoses = uniqueSubjectIds.map((subjectId) => {
    const subjectRows = perKgData.filter(
      (row) => idField && row[idField] === subjectId,
    );
    return subjectRows
      .map((row) => {
        const amount = amountField && +row[amountField];
        const amountUnit = amountUnitField && row[amountUnitField];
        const perBodyWeight = perBodyWeightField && row[perBodyWeightField];
        const time = timeField && +row[timeField];
        const timeUnit = timeUnitField && row[timeUnitField];
        const route = routeField ? row[routeField] : "";
        return {
          subject: subjectId || "",
          amount: amount || 0,
          amountUnit,
          perBodyWeight,
          label: `Dose: ${amount} ${route}`,
          route,
          time: time || 0,
          timeUnit,
        };
      })
      .filter((row) => !!row.amount);
  });
  return subjectDoses;
}

export function stripDoses(subjectDosing: IDose[] = []) {
  // strip subject ID from dosing rows.
  return subjectDosing.map((dose: IDose) => {
    const { subject: _s, ...rest } = dose;
    return rest;
  });
}

export function uniqueDoses(subjectDoses: SubjectDoses[] = []) {
  // assume duplicate doses have the same JSON string representation.
  const doses = subjectDoses.map((subjectDosing) =>
    JSON.stringify(stripDoses(subjectDosing)),
  );
  return [...new Set(doses)].map((dose) => JSON.parse(dose));
}

export function getProtocols(subjectDoses: SubjectDoses[] = []): IProtocol[] {
  const protocols = uniqueDoses(subjectDoses).map((doses: IDose[], index) => {
    if (doses.length > 0) {
      const subjects: string[] = [];
      subjectDoses.forEach((subjectDosing) => {
        const subjectId = subjectDosing[0]?.subject;
        if (
          subjectId !== undefined &&
          subjectUsesProtocol(subjectDosing, doses)
        ) {
          subjects.push(subjectId);
        }
      });
      return {
        label: `${doses[0].label} ${index}`,
        doses,
        subjects,
      };
    }
    return null;
  });
  return protocols.filter(Boolean) as IProtocol[];
}

export function subjectUsesProtocol(
  subjectDoses: IDose[],
  protocolDoses: IDose[],
) {
  const doses = stripDoses(subjectDoses);
  return JSON.stringify(doses) === JSON.stringify(protocolDoses);
}
