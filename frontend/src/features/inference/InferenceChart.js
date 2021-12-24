import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Tabs from '@material-ui/core/Tabs';
import Box from '@material-ui/core/Box';
import { useSelector, useDispatch } from "react-redux";
import InferenceChartOptimisationResults from './InferenceChartOptimisationResults'
import InferenceChartSamplingResults from './InferenceChartSamplingResults'
import InferenceChartTraces from './InferenceChartTraces'
import { fetchChainsByInferenceId } from "../inference/chainSlice";

import {selectChainsByInferenceId} from './chainSlice'
import {selectAlgorithmById} from './algorithmsSlice'

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

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchChainsByInferenceId(inference.id));
    }, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [dispatch, inference.id]);


  const chains = useSelector((state) =>
    selectChainsByInferenceId(state, inference.id)
  );

  const algorithm = useSelector((state) =>
    selectAlgorithmById(state, inference.algorithm)
  )

  const isSampling = algorithm.category === "SA"

  const optimisationTabs = [
    //{ label: 'Fit', component: InferenceChartFit },
    { label: 'Traces', component: InferenceChartTraces },
    { label: 'Results', component: InferenceChartOptimisationResults },
  ]
  const samplingTabs = [
    //{ label: 'PosteriorPredictive', component: InferenceChartPosteriorPredictive },
    //{ label: 'Biplot', component: InferenceChartBiplot},
    { label: 'Traces', component: InferenceChartTraces },
    { label: 'Results', component: InferenceChartSamplingResults },
  ]
  const tabs = isSampling ? samplingTabs : optimisationTabs

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
  <Box sx={{ width: '100%' }}>
  <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
  <Tabs value={value} onChange={handleChange}>
    { tabs.map(tab => (
      <Tab key={tab.label} label={tab.label} />
    ))}
  </Tabs>
  </Box>
    { tabs.map((tab, index) => (
    <TabPanel key={index} value={value} index={index}>
      <tab.component inference={inference} algorithm={algorithm} chains={chains} />
    </TabPanel>
    ))}
  </Box>
  )
}
