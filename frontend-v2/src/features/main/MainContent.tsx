import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { PageName } from './mainSlice';
import ProjectTable from '../projects/Projects';
import Drug from '../drug/Drug';

const MainContent: React.FC = () => {
  const page = useSelector((state: RootState) => state.main.selectedPage);
  let pageComponent = (<ProjectTable />)
  if (page === PageName.DRUG) {
    pageComponent = (<Drug />)
  }

  return (
    <>
      {pageComponent}
    </>
  );
};

export default MainContent;
