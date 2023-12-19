import { ReactNode } from "react";
import { NotificationTypes, notificationTypes } from "./notificationTypes";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import "./Notification.css";

type NotificationProps = {
  text: string | ReactNode;
  variant?: NotificationTypes;
  testId: string;
  onClick?: () => void;
};

const notificationIcon = (variant: NotificationTypes) => {
  switch (variant) {
    case notificationTypes.SUCCESS:
      return <CheckCircleOutlineIcon />;
    case notificationTypes.ERROR:
      return <CancelOutlinedIcon />;
    case notificationTypes.INFORMATION:
      return <InfoOutlinedIcon />;
  }
};

export const Notification = ({
  text,
  variant = notificationTypes.INFORMATION,
  testId,
  onClick,
}: NotificationProps) => (
  <div
    className={`notification notification--${variant.toLowerCase()}`}
    data-testid={testId}
  >
    <div
      onClick={onClick}
      role="button"
      onKeyDown={onClick}
      tabIndex={0}
      className="notification__text"
      data-testid={"notification-text"}
    >
      <div className="notification__content">
        {notificationIcon(variant)}
        <div className="notification__text">
          <div className="notification__title">{variant}</div>
          <div className="notification__message">{text}</div>
        </div>
        <div className="notification__remove">
          <CloseIcon />
        </div>
      </div>
    </div>
  </div>
);
