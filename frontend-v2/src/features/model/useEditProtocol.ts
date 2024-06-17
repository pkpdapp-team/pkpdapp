import {
  CompoundRead,
  DoseRead,
  ProjectRead,
  UnitRead,
  VariableRead,
  useProtocolCreateMutation,
  useProtocolDestroyMutation,
} from "../../app/backendApi";

interface EditProtocolProps {
  compound: CompoundRead;
  project: ProjectRead;
  units: UnitRead[];
  timeVariable: VariableRead | undefined;
  variable: VariableRead;
  watchProtocolId: number | null | undefined;
}

export default function useEditProtocol({
  compound,
  project,
  units,
  timeVariable,
  variable,
  watchProtocolId,
}: EditProtocolProps) {
  const hasProtocol: boolean = watchProtocolId != null;
  const variableUnit = units.find((unit) => unit.id === variable.unit);
  const defaultTimeUnit = timeVariable
    ? units?.find((u) => u.id === timeVariable.unit)
    : units?.find((unit) => unit.symbol === "h");
  const [createProtocol] = useProtocolCreateMutation();
  const [destroyProtocol] = useProtocolDestroyMutation();

  const addProtocol = () => {
    const isPerKg = variableUnit?.g !== 0;
    const doseAmountUnitSymbol = isPerKg ? "mg/kg" : "mg";
    const doseAmountUnit = units.find(
      (unit) => unit.symbol === doseAmountUnitSymbol,
    );
    const isSmallMolecule = compound.compound_type === "SM";
    const defaultDose: DoseRead = {
      id: 0,
      amount: 1,
      start_time: 0,
      repeat_interval: isSmallMolecule ? 24 : 168,
      repeats: 1,
      duration: 0.0833,
    };
    return createProtocol({
      protocol: {
        doses: [defaultDose],
        amount_unit: doseAmountUnit?.id || variable.unit,
        time_unit: defaultTimeUnit?.id || undefined,
        name: variable.name,
        project: project.id,
        mapped_qname: variable.qname,
      },
    });
  };

  const removeProtocol = () => {
    if (hasProtocol && watchProtocolId) {
      return destroyProtocol({ id: watchProtocolId });
    }
  };
  return { addProtocol, removeProtocol, hasProtocol };
}
