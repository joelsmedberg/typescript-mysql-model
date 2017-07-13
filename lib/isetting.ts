export interface ISetting {
  singularizeClassNames: boolean;
  /**
   * default should be: export interface
   */
  defaultClassModifier: string;
  optionalParameters: boolean;
  camelCaseFnNames: boolean;
  appendIToFileName: boolean;
  appendIToDeclaration: boolean;
  suffixGeneratedToFilenames: boolean;
}
