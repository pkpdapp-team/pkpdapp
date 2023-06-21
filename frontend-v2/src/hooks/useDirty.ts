import { useDispatch } from "react-redux";
import { decrementDirtyCount, incrementDirtyCount } from "../features/main/mainSlice";
import { useEffect, useState } from "react";
import usePrevious from "./usePrevious";

function useDirty(isDirty: boolean) {
  const dispatch = useDispatch();
  useEffect(() => {
    console.log('useDirty', isDirty)
    if (isDirty) {
      console.log('incrementing dirty count')
      dispatch(incrementDirtyCount())
      return () => {
        console.log('useDirty cleanup')
        dispatch(decrementDirtyCount())
      };
    }
    
  }, [isDirty]);
}

export default useDirty;