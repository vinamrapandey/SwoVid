// Ambient declaration so `process.env.NODE_ENV` type-checks under `tsc`.
// At bundle time Vite statically replaces this expression, so no runtime
// `process` reference remains in the shipped code.
declare const process: {
  env: {
    NODE_ENV?: string;
  };
};
