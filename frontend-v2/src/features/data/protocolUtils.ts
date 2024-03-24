import { StepperState } from './LoadDataStepper';

export interface IDose {
  subject: string,
  amount: number,
  amountUnit?: string,
  route?: string,
  time?: number,
  timeUnit?: string
}

export type SubjectDoses = IDose[];

export interface IProtocol {
  label: string,
  doses: IDose[],
  subjects: string[]
}

export function getSubjectDoses(state: StepperState): SubjectDoses[] {
  const idField = state.fields.find((field, index) => state.normalisedFields[index] === 'ID');
  const amountField = state.fields.find((field, index) => state.normalisedFields[index] === 'Amount');
  const amountUnitField = state.fields.find(
     (field, index) => ['Amount Unit', 'Unit'].includes(state.normalisedFields[index])
  );
  const timeField = state.fields.find((field, index) => state.normalisedFields[index] === 'Time');
  const timeUnitField = state.fields.find((field, index) => state.normalisedFields[index] === 'Time Unit');
  const routeField = state.fields.find(field => field.toLowerCase() === 'route');
  const subjectIds = state.data.map(row => idField && row[idField]);
  const uniqueSubjectIds = [...new Set(subjectIds)];
  const subjectDoses = uniqueSubjectIds.map(subjectId => {
    const subjectRows = state.data.filter(row => idField && row[idField] === subjectId);
    return subjectRows.map(row => {
      const amount = amountField && +row[amountField];
      const amountUnit = amountUnitField && row[amountUnitField];
      const time = timeField && +row[timeField];
      const timeUnit = timeUnitField && row[timeUnitField];
      const route = routeField ? row[routeField] : '';
      return {
        subject: subjectId || '',
        amount: amount || 0,
        amountUnit,
        label: `Dose: ${amount} ${route}`,
        route,
        time: time || 0,
        timeUnit
      };
    })
    .filter(row => !!row.amount);
  });
  return subjectDoses;
}

export function stripDoses(subjectDosing: IDose[] = []) {
// strip subject ID from dosing rows.
  return subjectDosing.map((dose: IDose) => {
    const { subject, ...rest } = dose;
    return rest;
  })
}

export function uniqueDoses(subjectDoses: SubjectDoses[] = []) {
  // assume duplicate doses have the same JSON string representation.
  const doses = subjectDoses.map(subjectDosing => JSON.stringify(stripDoses(subjectDosing)));
  return [...new Set(doses)].map(dose => JSON.parse(dose));
}

export function getProtocols(subjectDoses: SubjectDoses[] = []): IProtocol[] {
  return uniqueDoses(subjectDoses).map(doses => {
    const subjects: string[] = [];
    subjectDoses.forEach(subjectDosing => {
      const subjectId = subjectDosing[0]?.subject;
      if (subjectUsesProtocol(subjectDosing, doses)) {
          subjects.push(subjectId);
      }
    });
    return {
      label: doses[0]?.label,
      doses,
      subjects
    };
  });
}

export function subjectUsesProtocol(subjectDoses: IDose[], protocolDoses: IDose[]) {
  const doses = stripDoses(subjectDoses);
  return JSON.stringify(doses) === JSON.stringify(protocolDoses);
}
