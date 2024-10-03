import { SyntheticEvent, useState } from "react";

const rowsPerPageOptions = [25, 50, 100, 250, 500];
const defaultRowsPerPageOption = 50;

export const usePagination = () => {
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    defaultRowsPerPageOption,
  );
  const [page, setPage] = useState<number>(0);
  const [isDense, setIsDense] = useState(true);

  const handleChangeRowsPerPage = (event: PointerEvent) => {
    setRowsPerPage(event?.target?.value || 0);
    setPage(0);
  };

  const handlePageChange = (event: SyntheticEvent, pageNumber: number) => {
    setPage(pageNumber);
  };

  const handleDenseChange = () => {
    setIsDense(!isDense)
  }

  return {
    page,
    rowsPerPage,
    rowsPerPageOptions,
    isDense,
    handleChangeRowsPerPage,
    handlePageChange,
    handleDenseChange
  };
};
