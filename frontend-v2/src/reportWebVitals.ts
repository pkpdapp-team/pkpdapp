import { onCLS, onFID, onFCP, onLCP, onTTFB } from "web-vitals";

const reportWebVitals = (onPerfEntry = console.log) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    onCLS(onPerfEntry);
    onFID(onPerfEntry);
    onFCP(onPerfEntry);
    onLCP(onPerfEntry);
    onTTFB(onPerfEntry);
  }
};

export default reportWebVitals;
