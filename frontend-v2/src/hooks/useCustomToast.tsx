import { toast, ToastOptions } from "react-toastify";
import { Notification } from "./../components/Notification/Notification";
import { NotificationTypes } from "../components/Notification/notificationTypes";

// @ts-nocheck
type ToastProps = {
  type: NotificationTypes;
  text: string;
  autoClose: number;
  onClick?: () => void;
};

const defaultOptions: ToastOptions = {
  autoClose: Infinity,
  position: toast.POSITION.TOP_RIGHT,
  pauseOnFocusLoss: false,
  type: toast.TYPE.DEFAULT,
  pauseOnHover: false,
  closeButton: false,
  hideProgressBar: true,
  style: {
    padding: 0,
    background: "none",
    boxShadow: "none",
    top: "60px",
    minWidth: "fit-content",
  },
};

export const useCustomToast =
  () =>
  ({ type, text, autoClose, onClick }: ToastProps) =>
    toast(
      <Notification
        onClick={onClick}
        text={text}
        variant={type}
        testId={text}
      />,
      {
        ...defaultOptions,
        autoClose,
      },
    );
