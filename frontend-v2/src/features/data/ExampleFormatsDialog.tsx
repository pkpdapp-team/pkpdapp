import { FC, SyntheticEvent, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import * as XLSX from "xlsx";
import { EXAMPLE_FORMATS, ExampleFormat } from "./exampleFormats";

interface ExampleFormatsDialogProps {
  open: boolean;
  onClose: () => void;
}

function a11yProps(index: number) {
  return {
    id: `example-format-tab-${index}`,
    "aria-controls": `example-format-tabpanel-${index}`,
  };
}

/** Export a single example as an .xlsx file containing only its data. */
function downloadExample(example: ExampleFormat) {
  const dataRows = example.rows.filter((row) => row[0] !== "…");
  const worksheet = XLSX.utils.aoa_to_sheet([example.columns, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${example.fileName}.xlsx`);
}

/**
 * A tabbed help dialog that documents the supported dataset file formats.
 * Each tab shows the recommended columns, a full block of example rows, any
 * format-specific notes and tips, plus a link to download the example data.
 */
const ExampleFormatsDialog: FC<ExampleFormatsDialogProps> = ({
  open,
  onClose,
}) => {
  const [tab, setTab] = useState(0);

  function handleTabChange(_event: SyntheticEvent, newValue: number) {
    setTab(newValue);
  }

  const example = EXAMPLE_FORMATS[tab];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{ zIndex: 10000 }}
      slotProps={{
        paper: { sx: { height: "90vh", maxHeight: "calc(100% - 32px)" } }
      }}
    >
      <DialogTitle>Example file formats</DialogTitle>
      <DialogContent dividers>
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          selectionFollowsFocus
        >
          {EXAMPLE_FORMATS.map((format, index) => (
            <Tab key={format.fileName} label={format.name} {...a11yProps(index)} />
          ))}
        </Tabs>
        <Box
          role="tabpanel"
          id={`example-format-tabpanel-${tab}`}
          aria-labelledby={`example-format-tab-${tab}`}
          sx={{ pt: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 2,
            }}
          >
            <Typography variant="body1" gutterBottom>
              {example.description}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={() => downloadExample(example)}
              sx={{ flexShrink: 0 }}
            >
              Download example
            </Button>
          </Box>
          {example.notes && (
            <Box component="ul" sx={{ mt: 1, mb: 2, pl: 3 }}>
              {example.notes.map((note, index) => (
                <Typography component="li" variant="body2" key={index}>
                  {note}
                </Typography>
              ))}
            </Box>
          )}
          <Typography variant="h6" component="h3" sx={{ mt: 2 }} gutterBottom>
            Tips
          </Typography>
          <Box component="ol" sx={{ pl: 3, m: 0 }}>
            {example.tips.map((tip, index) => (
              <Typography component="li" variant="body2" key={index}>
                {tip}
              </Typography>
            ))}
          </Box>
          <TableContainer sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {example.columns.map((column) => (
                    <TableCell key={column} sx={{ fontWeight: "bold" }}>
                      {column}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {example.rows.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell key={cellIndex}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExampleFormatsDialog;
