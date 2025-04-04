import { FC, useCallback, useRef, useState } from "react";
import {
  CombinedModelRead,
  CompoundRead,
  ProjectRead,
  ProjectSpeciesEnum,
  UnitRead,
  VariableRead,
} from "../../app/backendApi";
import { Control } from "react-hook-form";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import VariableRow from "./VariableRow";
import HelpButton from "../../components/HelpButton";
import { FormData } from "./Model";
import { defaultHeaderSx } from "../../shared/tableHeadersSx";
import { TableHeader } from "../../components/TableHeader";
import AdditionalParametersRow from "./AdditionalParametersRow";
import { getTableHeight } from "../../shared/calculateTableHeights";

export const TABLE_BREAKPOINTS = [
  {
    minHeight: 1100,
    tableHeight: "38uvh",
  },
  {
    minHeight: 1000,
    tableHeight: "36vh",
  },
  {
    minHeight: 900,
    tableHeight: "32vh",
  },
  {
    minHeight: 800,
    tableHeight: "30vh",
  },
  {
    minHeight: 700,
    tableHeight: "27vh",
  },
  {
    minHeight: 600,
    tableHeight: "23vh",
  },
];

interface Props {
  model: CombinedModelRead;
  project: ProjectRead;
  control: Control<FormData>;
  variables: VariableRead[];
  units: UnitRead[];
  compound: CompoundRead;
}

const MapVariablesTab: FC<Props> = ({
  model,
  project,
  control,
  variables,
  units,
  compound,
}: Props) => {
  const [dosings, setDosing] = useState<
    {
      key: number;
      hasDosingSelected: boolean;
      projectId: number;
      species: ProjectSpeciesEnum | undefined;
    }[]
  >([]);
  const [linkToPds, setLinkToPd] = useState<
    {
      key: number;
      hasPdSelected: boolean;
      projectId: number;
      species: ProjectSpeciesEnum | undefined;
    }[]
  >([]);
  const [lagTimes, setLagTimes] = useState<
    {
      key: number;
      hasLagTimeSelected: boolean;
      projectId: number;
      species: ProjectSpeciesEnum | undefined;
    }[]
  >([]);

  const updateDosings = useCallback(
    (key: number, value: boolean) => {
      setDosing((prevDosings) => [
        ...prevDosings.filter(
          ({ key: dosingKey, species, projectId }) =>
            key !== dosingKey &&
            species === project.species &&
            projectId === project.id,
        ),
        {
          key,
          hasDosingSelected: value,
          projectId: project?.id,
          species: project?.species,
        },
      ]);
    },
    [project?.id, project?.species],
  );

  const updateLinksToPd = useCallback(
    (key: number, value: boolean) => {
      setLinkToPd((prevLinks) => [
        ...prevLinks.filter(
          ({ key: linkKey, species, projectId }) =>
            key !== linkKey &&
            species === project.species &&
            projectId === project.id,
        ),
        {
          key,
          hasPdSelected: value,
          projectId: project?.id,
          species: project?.species,
        },
      ]);
    },
    [project?.id, project?.species],
  );

  const updateLagTimes = useCallback(
    (key: number, value: boolean) => {
      setLagTimes((prevLags) => [
        ...prevLags.filter(
          ({ key: lagKey, species, projectId }) =>
            key !== lagKey &&
            species === project.species &&
            projectId === project.id,
        ),
        {
          key,
          hasLagTimeSelected: value,
          projectId: project?.id,
          species: project?.species,
        },
      ]);
    },
    [project?.id, project?.species],
  );

  const iconRef = useRef<HTMLDivElement | null>(null);
  const isAnyDosingSelected = dosings
    .filter(({ projectId }) => projectId === project?.id)
    .map(({ hasDosingSelected }) => hasDosingSelected)
    .some(Boolean);
  const isAnyLinkToPdSelected = linkToPds
    .filter(({ projectId }) => projectId === project?.id)
    .map(({ hasPdSelected }) => hasPdSelected)
    .some(Boolean);
  const isAnyLagTimeSelected = lagTimes
    .filter(({ projectId }) => projectId === project?.id)
    .map(({ hasLagTimeSelected }) => hasLagTimeSelected)
    .some(Boolean);
  const isPreclinical = project.species !== "H" && model.is_library_model;
  const concentrationUnit = units.find((unit) => unit.symbol === "pmol/L");
  const amountUnit = isPreclinical
    ? units.find((unit) => unit.symbol === "pmol/kg")
    : units.find((unit) => unit.symbol === "pmol");
  if (concentrationUnit === undefined || amountUnit === undefined) {
    return <>No concentration or amount unit found</>;
  }

  const timeVaryingVariables = variables.filter(
    (variable) => !variable.constant,
  );
  timeVaryingVariables.sort((a, b) => {
    const aisPK = a.qname.startsWith("PK");
    const bisPK = b.qname.startsWith("PK");
    const hasPk = aisPK || bisPK;
    if (hasPk) {
      return aisPK ? -1 : 1;
    }
    const aIsConcentration =
      concentrationUnit?.compatible_units.find(
        (unit) => parseInt(unit.id) === a.unit,
      ) !== undefined;
    const aIsAmount =
      amountUnit?.compatible_units.find(
        (unit) => parseInt(unit.id) === a.unit,
      ) !== undefined;
    const bIsConcentration =
      concentrationUnit?.compatible_units.find(
        (unit) => parseInt(unit.id) === b.unit,
      ) !== undefined;
    const bIsAmount =
      amountUnit?.compatible_units.find(
        (unit) => parseInt(unit.id) === b.unit,
      ) !== undefined;

    const aValue = aIsConcentration ? 2 : aIsAmount ? 1 : 0;
    const bValue = bIsConcentration ? 2 : bIsAmount ? 1 : 0;

    if (aValue !== bValue) {
      return bValue - aValue;
    } else {
      return a.name > b.name ? 1 : -1;
    }
  });

  const dosingCompartmentHelp = (
    <>
      <p>
        IV dosing: A1 for PK models and A1_f (full TMDD models) or A1_t (for QSS
        models)
      </p>
      <p>PO/SC dosing: Aa</p>
      <p>For custom-made models, please consult your tM&S expert</p>
    </>
  );

  const aucHelp = (
    <p>
      Calculate secondary parameters for this variable (see &quot;Secondary
      Parameters&quot; tab)
    </p>
  );
  const sROHelp = (
    <p>
      The receptor occupancy for SM and LM (calc_RO) is calculated from the
      total drug concentration (typcially C1 or Ce), the total target
      concentration and the KD value of drug-target binding
    </p>
  );

  const unboundHelp = (
    <p>
      For SM, the unbound concentration in plasma is calculated by multiplying
      the central drug concentration (typically C1) by fup (see Parameter tab)
    </p>
  );

  const bloodHelp = (
    <p>
      For SM, the total concentration in blood is calculated by dividing the
      central drug concentration (typically C1) by BP (see Parameter tab)
    </p>
  );

  const lagTimeHelp = (
    <p>
      Adds a tlag parameter to the model, which is the time delay between the
      dosing into the chosen compartment and the first observation of drug in
      this compartment
    </p>
  );

  const unitsHelp = (
    <p>
      Displayed units represent the default units of pkpd explorer. If you
      export your simulations to csv file (in Simulations), those are the units
      of the reported variables. If you want to change the units of a variable,
      you can do so in Simulations / Customize Plot
    </p>
  );

  const haveTLag = model.has_lag;

  const effectVariable = variables.find(
    (variable) =>
      variable.qname === "PDCompartment.C_Drug" ||
      variable.qname === "PDCompartment2.C_Drug",
  );
  const timeVariable = variables.find(
    (variable) => variable.binding === "time",
  );

  const sortVariables = (variable1: VariableRead, variable2: VariableRead) => {
    if (variable1.name.startsWith("C") && variable2.name.startsWith("A")) {
      return -1;
    }

    if (variable1.name.startsWith("A") && variable2.name.startsWith("C")) {
      return 1;
    }

    return variable1.name < variable2.name ? -1 : 1;
  };

  return (
    <>
      <TableHeader variant="h5" label="Select Dosing Route(s)" />
      <TableContainer
        sx={{
          width: "90%",
          marginTop: 0,
          maxHeight: getTableHeight({ steps: TABLE_BREAKPOINTS }),
        }}
      >
        <Table
          stickyHeader
          size="small"
          sx={{ "& .MuiTableCell-head": { lineHeight: 1 } }}
        >
          <TableHead>
            <TableRow>
              <TableCell size="small">
                <div style={{ ...defaultHeaderSx }}>Name</div>
              </TableCell>
              <TableCell size="small">
                <div style={{ ...defaultHeaderSx }}>
                  Unit
                  <HelpButton title={"Unit"}>{unitsHelp}</HelpButton>
                </div>
              </TableCell>
              <TableCell size="small">
                <div style={{ ...defaultHeaderSx }}>Type</div>
              </TableCell>
              <Tooltip placement="top-start" title="Select dosing compartment">
                <TableCell size="small">
                  <div ref={iconRef} style={{ ...defaultHeaderSx }}>
                    <p>
                      Dosing Compartment <span style={{ color: "red" }}>*</span>
                    </p>
                    <HelpButton title={"Dosing Compartment"}>
                      {dosingCompartmentHelp}
                    </HelpButton>
                  </div>
                </TableCell>
              </Tooltip>
            </TableRow>
          </TableHead>
          <TableBody>
            {variables.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>No variables found</TableCell>
              </TableRow>
            )}
            {timeVaryingVariables.sort(sortVariables).map((variable) => (
              <VariableRow
                key={variable.id}
                variable={variable}
                model={model}
                control={control}
                project={project}
                compound={compound}
                effectVariable={effectVariable}
                units={units}
                timeVariable={timeVariable}
                updateDosings={updateDosings}
                isAnyDosingSelected={isAnyDosingSelected}
                updateLinksToPd={updateLinksToPd}
                updateLagTimes={updateLagTimes}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ marginTop: ".5rem" }}>
        <TableHeader variant="h5" label="Map RO, PD and secondary parameters" />
      </Box>
      <TableContainer
        sx={{
          width: "90%",
          marginTop: "1rem",
          maxHeight: getTableHeight({ steps: TABLE_BREAKPOINTS }),
        }}
      >
        <Table stickyHeader sx={{ "& .MuiTableCell-head": { lineHeight: 1 } }}>
          <TableHead>
            <TableCell>
              <div style={{ ...defaultHeaderSx }}>Name</div>
            </TableCell>
            {haveTLag && (
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  {" "}
                  Lag Time <span style={{ color: "red" }}>*</span>
                  <HelpButton title={"Lag Time"}>{lagTimeHelp}</HelpButton>
                </div>
              </TableCell>
            )}
            {model?.pd_model && (
              <Tooltip
                placement="top-start"
                title="Select drug concentration that drives PD effects"
              >
                <TableCell>
                  <div style={{ ...defaultHeaderSx }}>
                    <p>
                      Link to PD <span style={{ color: "red" }}>*</span>
                    </p>
                  </div>
                </TableCell>
              </Tooltip>
            )}
            <Tooltip
              placement="top-start"
              title="Calculate secondary parameters."
            >
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  {" "}
                  Secondary parameters
                  <HelpButton title={"Secondary Parameters"}>
                    {aucHelp}
                  </HelpButton>
                </div>
              </TableCell>
            </Tooltip>
            <Tooltip
              placement="top-start"
              title="Select drug concentration that drives RO"
            >
              <TableCell>
                <div style={{ ...defaultHeaderSx }}>
                  {" "}
                  Link to Static Receptor Occupancy
                  <HelpButton title={"Link to Static Receptor Occupancy"}>
                    {sROHelp}
                  </HelpButton>
                </div>
              </TableCell>
            </Tooltip>
            {compound.compound_type === "SM" && (
              <>
                <Tooltip
                  placement="top-start"
                  title="Unbound concentration is calculated"
                >
                  <TableCell>
                    <div style={{ ...defaultHeaderSx }}>
                      {" "}
                      Unbound Concentration
                      <HelpButton title={"Unbound Concentration"}>
                        {unboundHelp}
                      </HelpButton>
                    </div>
                  </TableCell>
                </Tooltip>
                <Tooltip
                  placement="top-start"
                  title="Blood concentration is calculated"
                >
                  <TableCell>
                    <div style={{ ...defaultHeaderSx }}>
                      {" "}
                      Blood Concentration
                      <HelpButton title={"Blood concentration"}>
                        {bloodHelp}
                      </HelpButton>
                    </div>
                  </TableCell>
                </Tooltip>
              </>
            )}
          </TableHead>
          <TableBody>
            {timeVaryingVariables.sort(sortVariables).map((variable) => (
              <AdditionalParametersRow
                key={variable.id}
                variable={variable}
                model={model}
                control={control}
                project={project}
                compound={compound}
                effectVariable={effectVariable}
                units={units}
                timeVariable={timeVariable}
                updateDosings={updateDosings}
                updateLinksToPd={updateLinksToPd}
                isAnyLinkToPdSelected={isAnyLinkToPdSelected}
                updateLagTimes={updateLagTimes}
                isAnyLagTimeSelected={isAnyLagTimeSelected}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default MapVariablesTab;
