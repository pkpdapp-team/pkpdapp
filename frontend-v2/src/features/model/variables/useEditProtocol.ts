import {
  CompoundRead,
  Dose,
  ProjectRead,
  Protocol,
  UnitRead,
  VariableRead,
  useProtocolCreateMutation,
  useProtocolDestroyMutation,
  useProtocolListQuery,
  useProtocolUpdateMutation,
  useSubjectGroupListQuery,
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
  const { data: groups } = useSubjectGroupListQuery({
    projectId: project.id,
  });


  const hasProtocol = protocols?.some((protocol) => protocol.variable === variable.id && !protocol.dataset);

  async function addProtocol() {
    const isPerKg = variableUnit?.g !== 0;
    const doseAmountUnitSymbol = isPerKg ? "mg/kg" : "mg";
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
    const defaultProtocol: Protocol = {
      doses: [defaultDose],
      amount_unit: doseAmountUnit?.id || variable.unit,
      time_unit: defaultTimeUnit?.id || undefined,
      name: variable.name,
      project: project.id,
      variable: variable.id,
    }
    await createProtocol({
      protocol: defaultProtocol,
    });
    // also add protocol to each group that isn't linked to a dataset
    for (const group of groups || []) {
      if (!group.dataset) {
        await createProtocol({
          protocol: {
            ...defaultProtocol,
            name: `${variable.name} - ${group.name}`,
            group: group.id,
          },
        });
      }
    }
  };

  async function removeProtocol() {
    // remove all protocols associated with this variable except
    // for those linked to datasets
    for (const protocol of protocols || []) {
      if (protocol.variable !== variable.id) continue;
      if (protocol.dataset) continue;
      await destroyProtocol({ id: protocol.id });
    }
  }
  return { addProtocol, removeProtocol, hasProtocol, updateProtocol };
}
