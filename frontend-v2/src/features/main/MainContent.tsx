import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { PageName } from './mainSlice';
import ProjectTable from '../projects/Projects';
import Drug from '../drug/Drug';
import Model from '../model/Model';
import Simulations from '../simulation/Simulations';
import Protocols from '../trial/Protocols';

const MainContent: React.FC = () => {
  const page = useSelector((state: RootState) => state.main.selectedPage);
  let pageComponent = (<ProjectTable />)
  if (page === PageName.DRUG) {
    pageComponent = (<Drug />)
  }
  if (page === PageName.MODEL) {
    pageComponent = (<Model />)
  }
  if (page === PageName.SIMULATIONS) {
    pageComponent = (<Simulations />)
  }
  if (page === PageName.TRIAL_DESIGN) {
    pageComponent = (<Protocols />)
  }

  return (
    <>
      {pageComponent}
    </>
  );
};

export default MainContent;
