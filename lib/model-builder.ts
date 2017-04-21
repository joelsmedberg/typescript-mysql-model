import { DatabaseColumn, DatabaseTable, DatabaseSchema } from "./mysql-database-definition";
import * as Knex from 'knex';

const LIST_TYPE_VIEW = "VIEW";
const LIST_TYPE_TABLE = "BASE TABLE";
export default class ModelBuilder {
    constructor(private knex:Knex, private databaseName:string){

    }

    /**
     * Return a copy of an object but with all keys lower case
     */
    static keysToLower<T>(obj:T):T {
        let newobj:T = {} as any;
        Object.keys(obj).forEach(key => newobj[key.toLowerCase()] = obj[key]);
        return newobj;
    }

    /**
     * Return the length of a type, eg varchar(255)=>255
     * @param type
     */
    private static getMysqlLength(strType: string):number {
        let strip = strType.replace(/\D/g, '');
        return strip.length == 0?0:parseInt(strip);
    }

    /**
     * Return the length of a type, eg varchar(255)=>varchar
     * @param type
     */
    private static stripMysqlLength(type: string):string {
        let pos = type.indexOf("(");
        if (pos > -1) {
            return type.substr(0, pos);
        }
        return type;
    }

    /**
     * return a select query to list all tables or views from a database
     */
    private listFromDatabase(listType:string):string {
        if(listType != "BASE TABLE" &&  listType != "VIEW"){
            throw new Error("Illegal listtype")
        }
        let select = "`information_schema`.`TABLES`.`TABLE_NAME` AS `tname`";
        let from = "`information_schema`.`TABLES`";
        let dbClause = "`information_schema`.`TABLES`.`TABLE_SCHEMA` = '"+this.databaseName+"'";
        let baseTable = "`information_schema`.`TABLES`.`TABLE_TYPE` = '"+listType+"'";
        return `SELECT ${select} FROM ${from} WHERE ${dbClause} AND ${baseTable} `;
    }

    private async listViews(): Promise<string[]> {
        let rows:{tname}[][] = await this.knex.raw(this.listFromDatabase(LIST_TYPE_VIEW));
        return rows[0].map(item => item.tname);
    }

    /**
     * Lists all the tables in current database
     */
    private async listTables(): Promise<string[]> {
        let rows:{tname}[][] = await this.knex.raw(this.listFromDatabase(LIST_TYPE_TABLE));
        return rows[0].map(item => item.tname);
    }

    private columnArrayToDatabaseSchema(colArrMap:{[key:string]:DatabaseColumn[]}) {
        var schema:DatabaseSchema = {};
        for (var tableName in colArrMap) {
            colArrMap[tableName] = colArrMap[tableName].map((col,i) => {
                col = ModelBuilder.keysToLower<DatabaseColumn>(col);
                col.length = ModelBuilder.getMysqlLength(col.type);
                col.isPrimary = col.key == "PRI";
                col.index = i;
                col.type = ModelBuilder.stripMysqlLength(col.type);
                return col;
            });
            var newTable :DatabaseTable = {};
            colArrMap[tableName].forEach(col => newTable[col.field] = col);
            schema[tableName] = newTable;
        }
        return schema;
    }

    /**
     * List all columns for a table given table name
     */
    private async listColumns(tableName: string):Promise<DatabaseColumn[]> {
        return await this.knex.raw("SHOW COLUMNS FROM " + tableName).then(colData => colData[0]);
    }

    private async renderModel(tables:string[]){
        //TODO list all in one query instead of one query per table
        var columnArrayMap: {[key:string]:DatabaseColumn[]} = {};
        var promises = tables.map(async (tableName:string)=> {
            columnArrayMap[tableName] = await this.listColumns(tableName);
        });        
        await Promise.all(promises);
        return this.columnArrayToDatabaseSchema(columnArrayMap);
    }

    async renderViewModel() : Promise<DatabaseSchema> {
        var tables = await this.listViews();
        return await this.renderModel(tables);
    }

    async renderTableModel() : Promise<DatabaseSchema> {
        var tables = await this.listTables();        
        return this.renderModel(tables);
    }
}  
