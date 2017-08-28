export interface IDatabaseColumn {
    "extra": string;
    "default"?: any;
    "key": string;
    "null": string|boolean;
    "type": string;
    "field": string;
    "length": number;
    "isPrimary": boolean;
    "index": number;
}

export interface IDatabaseTable {
   [columnName: string]: IDatabaseColumn;
}

export interface ITableDictionary {
    [table: string]: IDatabaseTable;
}

export interface IStoredProcedureDictionary {
    [sp: string]: IStoredProcedure;
}

export interface IStoredProcedureParameter {
    specificName: string;
    ordinalPosition: number;
    parameterMode: string;
    parameterName: string;
    dataType: string;
    characterMaximumLength: number;
    characterOctetLength: number;
    numericPrecision: number;
    numericScale: number;
    datetimePrecision: any;
    characterSetName: string;
    collationName: string;
    dtdIdentifier: string;
    specificCatalog: string;
    specificSchema: string;
}

export interface IStoredProcedure {
    name: string;
    parameters: {
        [param: string]: IStoredProcedureParameter;
    };
}

export interface IDatabaseSchema {
    tables: ITableDictionary;
    views: ITableDictionary;
    storedProcedures: IStoredProcedureDictionary;
}
