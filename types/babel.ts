export type File = {
  opts: { filename: string; generatorOpts: { filename: string } };
};

export type State<PluinOpt = {}> = {
  opts: PluinOpt;
  file: File;
};
