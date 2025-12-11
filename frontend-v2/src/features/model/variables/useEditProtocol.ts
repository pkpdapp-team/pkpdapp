import {
  CompoundRead,
  Dose,
  ProjectRead,
  UnitRead,
  VariableRead,
  useProtocolCreateMutation,
  useProtocolDestroyMutation,
  useProtocolListQuery,
  useProtocolUpdateMutation,
} from "../../../app/backendApi";

interface EditProtocolProps {
  compound: CompoundRead;
  project: ProjectRead;
  units: UnitRead[];
  timeVariable: VariableRead | undefined;
  variable: VariableRead;
}

type DefaultDose = Omit<Dose, "id" | "protocol">;

export default function useEditProtocol({
  compound,
  project,
  units,
  timeVariable,
  variable,
}: EditProtocolProps) {
  const hasProtocol = variable.protocols.length > 0;
  const variableUnit = units.find((unit) => unit.id === variable.unit);
  const defaultTimeUnit = timeVariable
    ? units?.find((u) => u.id === timeVariable.unit)
    : units?.find((unit) => unit.symbol === "h");
  const [createProtocol] = useProtocolCreateMutation();
  const [destroyProtocol] = useProtocolDestroyMutation();
  const [updateProtocol] = useProtocolUpdateMutation();
  const { data: protocols } = useProtocolListQuery({
    projectId: project.id,
  });

  const addProtocol = () => {
    const isHuman = project.species === "H";
    const isAvhOrAah = variable.name == "Avh" || variable.name == "Aah";
    const isPerKg = !isHuman && !isAvhOrAah;
    const doseAmountUnitSymbol = "mg";
    const doseAmountUnit = units.find(
      (unit) => unit.symbol === doseAmountUnitSymbol,
    );
    const isSmallMolecule = compound.compound_type === "SM";
    const defaultDose: DefaultDose = {
      amount: 1,
      start_time: 0,
      repeat_interval: isSmallMolecule ? 24 : 168,
      repeats: 1,
      duration: 0.0833,
    };
    return createProtocol({
      protocol: {
        doses: [defaultDose],
        amount_per_body_weight: isPerKg,
        amount_unit: doseAmountUnit?.id || variable.unit,
        time_unit: defaultTimeUnit?.id || undefined,
        name: variable.name,
        project: project.id,
        variable: variable.id,
      },
    });
  };

  async function removeProtocol() {
    for (const protocol of protocols || []) {
      if (protocol.variable === variable.id) {
        await destroyProtocol({ id: protocol.id });
      }
    }
  }
  return { addProtocol, removeProtocol, hasProtocol, updateProtocol };
}
