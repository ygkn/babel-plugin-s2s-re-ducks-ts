declare module '@babel/plugin-syntax-typescript' {
  function syntaxTypeScript(): {
    manipulateOptions(opts: any, parserOpts: { plugins: string[] }): void;
  };

  export default syntaxTypeScript;
}
