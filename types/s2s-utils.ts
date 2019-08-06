declare module 's2s-utils' {
  import babelTemplate from '@babel/template';
  import * as types from '@babel/types';

  export function template(code: string, plugins?: string[]): ReturnType<typeof babelTemplate>;

  export function createImportDeclaration(
    locals: Array<string> | string,
    source: string,
  ): types.ImportDeclaration;
}
