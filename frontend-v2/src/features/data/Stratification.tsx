import { ChangeEvent, FC, useState } from 'react';
import {
  Box,
  Checkbox,
  Radio,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tabs,
  Tab,
  Typography
} from "@mui/material";
import { StepperState } from "./LoadDataStepper";
import { getProtocols, getSubjectDoses } from "./protocolUtils";
import ProtocolDataGrid from './ProtocolDataGrid';



interface IStratification {
  state: StepperState;
  firstTime: boolean;
}

const Stratification: FC<IStratification> = ({ state, firstTime }: IStratification) => {
  const idField = state.fields.find((field, index) => state.normalisedFields[index] === 'ID');
  const subjectDoses = getSubjectDoses(state);
  const protocols = getProtocols(subjectDoses);
  const groups = protocols.map((protocol, index) => ({
    name: `Group ${index + 1}`,
    subjects: protocol.subjects
  }));
  const catCovariates = state.fields.filter((field, index) =>
    state.normalisedFields[index] === 'Cat Covariate' && field.toLowerCase() !== 'route'
  );
  const uniqueCovariateValues = catCovariates.map(field => {
    const values = state.data.map(row => row[field]);
    return [...new Set(values)];
  });

  const [firstRow] = state.data;
  const [primaryCohort, setPrimaryCohort] = useState('Group');
  const [secondary, setSecondary] = useState<string[]>([]);
  const [tab, setTab] = useState(0);

  if (!firstRow['Group ID']) {
    const newData = [ ...state.data ];
    newData.forEach(row => {
      row['Group ID'] = row[primaryCohort] || '1';
    });
    state.setData(newData);
  }

  const handleTabChange = (event: ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  }

  const handlePrimaryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPrimaryCohort(event.target.value);
    const newData = [ ...state.data ];
    newData.forEach(row => {
      row['Group ID'] = row[event.target.value];
    });
    state.setData(newData);
  };

  const handleSecondaryChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.checked) {
      const newState = secondary.filter(value => value !== event.target.value);
      setSecondary(newState);
      return;
    } else {
      const newState = new Set([...secondary, event.target.value]);
      setSecondary([...newState]);
    }
    // TODO: update the Group ID column when groups Change.
  };

  function a11yProps(index: number) {
    return {
      id: `protocol-tab-${index}`,
      'aria-controls': `protocol-tabpanel`,
    };
  }

  return (
    <>
      {!!catCovariates.length && 
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography>Covariate</Typography>
              </TableCell>
              <TableCell>
                <Typography>Values</Typography>
              </TableCell>
              <TableCell id='heading-primary'>
                <Typography>Primary Grouping</Typography>
              </TableCell>
              <TableCell id='heading-secondary'>
                <Typography>Secondary Grouping</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {catCovariates.map((field, index) => {
              const primaryLabel = `heading-primary field-${field}`;
              const secondaryLabel = `heading-secondary field-${field}`;
              const isPrimary = primaryCohort === field;
              return (
                <TableRow key={field}>
                  <TableCell id={`field-${field}`}>{field}</TableCell>
                  <TableCell>{uniqueCovariateValues[index].join(',')}</TableCell>
                  <TableCell>
                    <Radio
                      name="primary"
                      value={field}
                      checked={isPrimary}
                      onChange={handlePrimaryChange}
                      inputProps={{ 'aria-labelledby': primaryLabel }}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      disabled={isPrimary}
                      name="secondary"
                      value={field}
                      checked={secondary.includes(field)}
                      onChange={handleSecondaryChange}
                      inputProps={{ 'aria-labelledby': secondaryLabel }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      }
      <Tabs value={tab} onChange={handleTabChange}>
        {groups.map((group, index) => (
          <Tab
            key={group.name}
            label={group.name}
            {...a11yProps(index)}
          />
        ))}
      </Tabs>
      <Box role='tabpanel' id='protocol-tabpanel'>
        <ProtocolDataGrid group={groups[tab]}  state={state} />
      </Box>
    </>
  );
}

export default Stratification;
