import babelTemplate from '@babel/template';

declare module 's2s-utils' {
  export function template(code: string, plugins: string[]): ReturnType<typeof babelTemplate>;
}
