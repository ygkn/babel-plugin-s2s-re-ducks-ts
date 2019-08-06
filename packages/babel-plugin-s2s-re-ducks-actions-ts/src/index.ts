import syntaxTypeScript from '@babel/plugin-syntax-typescript';
import camelCase from 'lodash.camelcase';
import * as type from '@babel/types';
import { PluginObj } from '@babel/core';
import { template, createImportDeclaration } from 's2s-utils';
import { parse } from 'path';

import { State } from '../../../types/babel';

const builders = {
  actionCreater: template(`export const NAME = (payload: TYPE.payload): TYPE => ({
    type: TYPE,
    payload
  })`)
};

const createActionCreater = (name: string) =>
  builders.actionCreater({
    NAME: type.identifier(camelCase(name)),
    TYPE: type.identifier(name)
  }) as type.Statement;

export default (): PluginObj<State> => ({
  inherits: syntaxTypeScript,
  name: 'babel-plugin-s2s-re-ducks-actions-ts',
  visitor: {
    Program: {
      exit(programPath, state) {
        const { file } = state;
        const basename = parse(file.opts.generatorOpts.filename).name;

        const imports: type.ImportDeclaration[] = [];
        const typeNames: string[] = [];
        const actions: string[] = [];
        const funcs: type.Statement[] = [];

        programPath.traverse({
          ImportDeclaration(path) {
            imports.push(path.node);
          },
          VariableDeclarator(path) {
            const idPath = path.get('id');
            if (idPath.isIdentifier()) {
              actions.push(idPath.node.name);
            }
          },
          TSTypeAliasDeclaration(path) {
            const { name } = path.get('id').node;

            if (name === 'Action') {
              return;
            }

            typeNames.push(name);
            funcs.push(createActionCreater(name));
          }
        });

        const constImport = createImportDeclaration(actions, `./${basename}`);
        const typeImport = createImportDeclaration(typeNames, `./${basename}`);

        programPath.node.body = [...imports, constImport, typeImport, ...funcs];
      }
    }
  }
});
