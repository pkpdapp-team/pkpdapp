import { Variable } from "../../app/backendApi";

const libraryParamOrder = ['CL', 'CLmax', 'Km', 'Kss', 'KD', 'V1', 'V2', 'V3', 'Q1', 'Q2', 'CT1_0', 'kdeg', 'kint', 'koff', 'F', 'ka', 'tlag', 'Kp', 'ke0'];
    
const qnameLibraryOrder = libraryParamOrder.map(param => 'PKCompartment.' + param);
const sliderPriority = (param: Variable) => {
    let priority = 0;
    if (param.qname.endsWith("_ud")) {
      priority = qnameLibraryOrder.length + 2;
    } else if (param.qname.startsWith("PK")) {
      priority = qnameLibraryOrder.length;
      let index = qnameLibraryOrder.indexOf(param.qname);
      if (index > -1) {
        priority = index;
      }
    } else if (param.qname.startsWith("PD")) {
      priority = qnameLibraryOrder.length + 1;
    }
    return priority;
  }
  
export default sliderPriority;