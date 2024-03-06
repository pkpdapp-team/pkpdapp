import { useDispatch } from "react-redux";
import {
  decrementDirtyCount,
  incrementDirtyCount,
} from "../features/main/mainSlice";
import { useEffect } from "react";

function useDirty(isDirty: boolean) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (isDirty) {
      dispatch(incrementDirtyCount());
      return () => {
        dispatch(decrementDirtyCount());
      };
    }
    return undefined;
  }, [isDirty, dispatch]);
}

export default useDirty;
