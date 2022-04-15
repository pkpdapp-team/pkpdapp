import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import Alert from "@material-ui/lab/Alert";
import { useSelector, useDispatch } from "react-redux";
import InferenceChartOptimisationResults from './InferenceChartOptimisationResults'
import InferenceChartSamplingResults from './InferenceChartSamplingResults'
import InferenceChartTraces from './InferenceChartTraces'
import InferenceChartFits from './InferenceChartFits'
import { fetchChainsByInferenceId } from "../inference/chainSlice";
import { fetchInferenceById } from "../inference/inferenceSlice";

import {selectChainsByInferenceId} from './chainSlice'
import {selectAlgorithmById} from './algorithmsSlice'


import {
  selectVariablesByPdModel,
  selectVariablesByDosedPkModel,
} from "../variables/variablesSlice";


function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

export default function InferenceChart({inference}) {
  const [value, setValue] = useState(0);
  const dispatch = useDispatch();

  const chains = useSelector((state) =>
    selectChainsByInferenceId(state, inference.id)
  );


  const priorsWithChainValues = inference.log_likelihoods.filter(
    ll => ll.is_a_prior
  ).map(ll => ({
    ...ll,  
    chains: chains.map(chain => chain.data.chain[ll.id]),
    kdes: chains.map(chain => chain.data.kde[ll.id])
  }));

  console.log('chains', chains)
  console.log('priorsWithChainValues', priorsWithChainValues)

  const algorithm = useSelector((state) =>
    selectAlgorithmById(state, inference.algorithm)
  )

  const isSampling = algorithm.category === "SA"

  const optimisationTabs = [
    //{ label: 'Fit', component: InferenceChartFit },
    { label: 'Traces', component: InferenceChartTraces },
    { label: 'Fits', component: InferenceChartFits },
    { label: 'Results', component: InferenceChartOptimisationResults },
  ]
  const samplingTabs = [
    //{ label: 'PosteriorPredictive', component: InferenceChartPosteriorPredictive },
    //{ label: 'Biplot', component: InferenceChartBiplot},
    { label: 'Traces', component: InferenceChartTraces },
    { label: 'Fits', component: InferenceChartFits },
    { label: 'Results', component: InferenceChartSamplingResults },
  ]
  const tabs = isSampling ? samplingTabs : optimisationTabs

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleRefresh = () => {
    dispatch(fetchChainsByInferenceId(inference.id));
    dispatch(fetchInferenceById(inference.id));
  }

  const noData = chains.length === 0

  return (
  <Box sx={{ width: '100%' }}>
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
  <Button
    variant="contained"
    onClick={handleRefresh}
  >
    Refresh
  </Button>
  { noData &&
      <Alert severity="warning">No data, refresh to get chain data</Alert>
  }
  <Tabs value={value} onChange={handleChange}>
    { tabs.map(tab => (
      <Tab key={tab.label} label={tab.label} />
    ))}
  </Tabs>
  </Box>
    { tabs.map((tab, index) => (
    <TabPanel key={index} value={value} index={index}>
      <tab.component inference={inference} chains={chains} priorsWithChainValues={priorsWithChainValues} />
    </TabPanel>
    ))}
  </Box>
  )
}
