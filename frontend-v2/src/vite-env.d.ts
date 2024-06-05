/// <reference types="vite/client" />
declare module '*.svg' {
  const content: string;
  export default content;
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
}
