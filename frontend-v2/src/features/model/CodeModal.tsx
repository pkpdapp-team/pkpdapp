import { Box, Modal, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import hljs from "highlight.js/lib/core";
import xml from "highlight.js/lib/languages/xml";
import "highlight.js/styles/a11y-light.css";
import { TableHeader } from "../../components/TableHeader";
import production from "react/jsx-runtime";
import { rehypeDom } from "rehype-dom";
import rehypeReact from "rehype-react";
import mmt from "./mmt";

hljs.configure({
  cssSelector: "code",
});
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("mmt", mmt);

function highlightCode(code: string, language: string): JSX.Element {
  const highlightedCode = hljs.highlight(code, { language }).value;
  return rehypeDom().use(rehypeReact, production).processSync(highlightedCode)
    .result;
}

export const CodeModal = ({
  isOpen,
  onClose,
  code,
  language,
}: {
  isOpen: boolean;
  onClose: () => void;
  code: string;
  language: string;
}) => {
  return (
    <Modal onClose={onClose} open={isOpen}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            width: "50wh",
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            padding: "1rem",
            justifyItems: "center",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <TableHeader label="Code" />
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Typography
            component={"code"}
            sx={{
              whiteSpace: "pre-wrap",
              maxHeight: "50vh",
              overflow: "auto",
              marginTop: "1rem",
              backgroundColor: "WhiteSmoke",
              padding: "6px",
              border: "1px solid dimgray",
            }}
          >
            {highlightCode(code, language)}
          </Typography>
        </Box>
      </Box>
    </Modal>
  );
};
