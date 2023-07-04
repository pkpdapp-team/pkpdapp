import { useDispatch } from "react-redux";
import { decrementDirtyCount, incrementDirtyCount } from "../features/main/mainSlice";
import { useEffect, useState } from "react";
import usePrevious from "./usePrevious";

function useDirty(isDirty: boolean) {
  const dispatch = useDispatch();
  useEffect(() => {
    if (isDirty) {
      dispatch(incrementDirtyCount())
      return () => {
        dispatch(decrementDirtyCount())
      };
    }
    
  }, [isDirty]);
}

export default useDirty;