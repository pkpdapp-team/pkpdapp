import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../app/store';
import { PageName } from './mainSlice';

const MainContent: React.FC = () => {
  const page = useSelector((state: RootState) => state.main.selectedPage);
  let pageComponent = (<Projects />)

  return (
    <>
      {pageComponent}
    </>
  );
};

export default MainContent;
