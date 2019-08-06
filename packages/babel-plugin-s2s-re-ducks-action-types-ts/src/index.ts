import syntaxTypeScript from '@babel/plugin-syntax-typescript';
import * as type from '@babel/types';
import { PluginObj, NodePath } from '@babel/core';
import { relative, join, dirname } from 'path';
import { template } from 's2s-utils';
import snakeCase from 'lodash.snakecase';
import slash from 'slash';
import { State, File } from '../../../types/babel';

const getTSTypeReferenceIDName = (
  path: NodePath<type.TSTypeReference>
): string => {
  const typeName = path.get('typeName');
  return typeName.isIdentifier() ? typeName.node.name : '';
};

const getTSTypeIDNames = (annotation: NodePath<type.TSType>): string[] =>
  annotation.node.type === 'TSTypeReference'
    ? [getTSTypeReferenceIDName(annotation as NodePath<type.TSTypeReference>)]
    : annotation.node.type === 'TSUnionType'
    ? (annotation as NodePath<type.TSUnionType>)
        .get('types')
        .map(path => getTSTypeIDNames(path)[0])
    : [];

const constantCase = (input: string) => snakeCase(input).toUpperCase();

const builders = {
  constants: template('export const NAME = VALUE as const'),
  actionType: template('export type NAME = { type: typeof VALUE }')
};

const getPrefix = ({ opts: { filename } }: File, removePrefix: string) => {
  const file = relative(join(process.cwd(), removePrefix), filename);
  return `${dirname(slash(file))}/`;
};

export default (): PluginObj<
  State<{ usePrefix: boolean; removePrefix: string }>
> => ({
  inherits: syntaxTypeScript,
  name: 'babel-plugin-s2s-re-ducks-action-types-ts',
  visitor: {
    Program: {
      exit(programPath, state) {
        const {
          file,
          opts: { usePrefix = true, removePrefix = '' }
        } = state;

        const imports: type.ImportDeclaration[] = [];

        const actionNameSet: Set<string> = new Set();
        const actionMap: Map<string, type.Node> = new Map();

        programPath.traverse({
          ImportDeclaration(path) {
            imports.push(path.node);
          },
          TSTypeAliasDeclaration(path: NodePath<type.TSTypeAliasDeclaration>) {
            if (path.get('id').node.name === 'Action') {
              // make set of action name from `type Action = ... `.

              const typeAnnotation = path.get('typeAnnotation');
              getTSTypeIDNames(typeAnnotation).forEach(actionName => {
                actionNameSet.add(actionName);
                if (actionName.endsWith('Request')) {
                  actionNameSet.add(actionName.replace(/Request$/, 'Success'));
                  actionNameSet.add(actionName.replace(/Request$/, 'Failure'));
                }
              });
            } else {
              // make map of type of actions from `type actionName = {...}`.
              const { node } = path.get('id');
              actionMap.set(node.name, path.parent);
            }
          }
        });

        const prefix = usePrefix ? getPrefix(file, removePrefix) : '';

        // const CONS: 'CONS' = 'prefix/CONS'
        const actionNames = [...actionNameSet.values()];

        const constantAST = actionNames.map(x => {
          const name = constantCase(x);
          const value = type.stringLiteral(`${prefix}${name}`);

          const actionName = type.identifier(name);
          return builders.constants({
            NAME: actionName,
            VALUE: value
          }) as type.ExportDeclaration;
        });

        // type ActionA = { typeof ACTION_A }
        const typesAst = actionNames.map(name => {
          if (actionMap.has(name)) {
            return actionMap.get(name) as type.Node;
          }

          return builders.actionType({
            NAME: type.identifier(name),
            VALUE: type.identifier(constantCase(name))
          }) as type.ExportDeclaration;
        });

        // export type Action = ...
        const exportTypeActionAst = type.exportNamedDeclaration(
          type.tsTypeAliasDeclaration(
            type.identifier('Action'),
            null,
            type.tsUnionType(
              actionNames.map(name =>
                type.tsTypeReference(type.identifier(name))
              )
            )
          ),
          []
        );

        // @ts-ignore
        programPath.node.body = [
          ...(imports.length > 0 ? imports : [type.noop()]),
          ...constantAST,
          type.noop(),
          ...typesAst,
          type.noop(),
          exportTypeActionAst
        ];
      }
    }
  }
});
