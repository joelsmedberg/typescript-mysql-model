export interface IDatabaseColumn {
    "extra": string;
    "default"?: any;
    "key": string;
    "null": string | boolean;
    "type": string;
    "field": string;
    "enumValues": string[] | null;
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
    characterMaximumLength: number | null;
    characterOctetLength: number | null;
    numericPrecision: number;
    numericScale: number;
    datetimePrecision: any;
    characterSetName: string | null;
    collationName: string | null;
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
