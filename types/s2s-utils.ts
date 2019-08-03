declare module 's2s-utils' {
  import babelTemplate from '@babel/template';

  export function template(code: string, plugins?: string[]): ReturnType<typeof babelTemplate>;
}
