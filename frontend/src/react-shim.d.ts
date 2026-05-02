declare module "react" {
  // minimal shim for environments without @types/react installed
  export type ChangeEvent<T = any> = any;
  export type KeyboardEvent<T = any> = any;
  export function useState<T = any>(initial?: T): any;
  export function useEffect(...args: any[]): any;
  export const Fragment: any;
  const React: any;
  export default React;
}

declare module "react/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
