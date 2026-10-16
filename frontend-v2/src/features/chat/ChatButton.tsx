import { FC } from "react";
import { Button } from "@mui/material";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { useAppDispatch } from "../../app/hooks";
import { toggleChat, selectChatOpen } from "./chatSlice";
import { useSelector } from "react-redux";
import { aiButtonSx } from "./aiButtonSx";

const ChatButton: FC = () => {
  const dispatch = useAppDispatch();
  const isOpen = useSelector(selectChatOpen);

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<ChatOutlinedIcon sx={{ fontSize: 16 }} />}
      aria-expanded={isOpen}
      onClick={() => dispatch(toggleChat())}
      sx={aiButtonSx(isOpen)}
    >
      Chat
    </Button>
  );
};

export default ChatButton;
