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

export interface DatabaseSchema {
    [tableName: string]: DatabaseTable;
}