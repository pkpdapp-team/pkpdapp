import { useEffect, useRef } from 'react';

type IntervalProps = {
  callback: () => void;
  delay: number;
  isDirty?: boolean;
};

export default function useInterval({ callback, delay, isDirty = false }: IntervalProps){
  const savedCallback = useRef<() => void>();

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (isDirty) {
        savedCallback.current!();
      }
    }
    if (delay) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay, isDirty]);

  useEffect(() => {
    return () => savedCallback.current!()
  }, []);
}
