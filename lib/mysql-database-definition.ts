export interface DatabaseColumn {
    "extra": string;
    "default"?: any;
    "key": string;
    "null": string|boolean;
    "type": string;
    "field": string;
    "length": number;
    "isPrimary": boolean;
    "index": number;
};

export interface DatabaseTable {
   [columnName: string]: DatabaseColumn; 
}

export interface TableDictionary {
    [table: string]: DatabaseTable;
}

export interface StoredProcedureDictionary { 
    [sp: string]: StoredProcedure
}

export interface StoredProcedureParameter {
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

export interface StoredProcedure {    
    name: string;
    parameters: {
        [param:string]: StoredProcedureParameter;
    }
}

export interface DatabaseSchema {
    tables: TableDictionary;
    views: TableDictionary;
    storedProcedures: StoredProcedureDictionary;
}