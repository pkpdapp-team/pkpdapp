import { useState } from "react";

const rowsPerPageOptions = [25, 50, 100, 250, 500];
const defaultRowsPerPageOption = 50;

export const usePagination = () => {
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    defaultRowsPerPageOption,
  );
  const [page, setPage] = useState<number>(0);
  const [isDense, setIsDense] = useState(true);

  const handleChangeRowsPerPage = (event: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>): void => {
    setRowsPerPage(page || 0);
    setPage(0);
  };

  const handlePageChange = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, page: number): void => {
    setPage(page);
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
