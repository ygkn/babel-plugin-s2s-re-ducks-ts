export type File = {
  opts: { filename: string };
};

export type State<PluinOpt = {}> = {
  opts: PluinOpt;
  file: File;
};
