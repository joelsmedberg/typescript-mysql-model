import { DatabaseColumn, DatabaseTable, DatabaseSchema } from "./mysql-database-definition";
import * as Knex from 'knex';

const LIST_TYPE_VIEW = "VIEW";
const LIST_TYPE_TABLE = "BASE TABLE";
export default class ModelBuilder {
    constructor(private knex:Knex){

    }

    private static objectToLowerCase<T>(obj:T):T {
        let keys = Object.keys(obj);        
        let n = keys.length;
        let newobj:T = {} as any
        while (n--) {
            let key = keys[n];
            newobj[key.toLowerCase()] = obj[key];
        }
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
    private static stripMysqlLength(type: string) {
        let pos = type.indexOf("(");
        if (pos > -1) {
            return type.substr(0, pos);
        }
        return type;
    }

    private listFromDatabase(listType:string) {
        if(listType != "BASE TABLE" &&  listType != "VIEW"){
            throw new Error("Illegal listtype")
        }
        let select = "`information_schema`.`TABLES`.`TABLE_NAME` AS `tname`";
        let from = "`information_schema`.`TABLES`";
        let dbClause = "`information_schema`.`TABLES`.`TABLE_SCHEMA` = DATABASE()";
        let baseTable = "`information_schema`.`TABLES`.`TABLE_TYPE` = '"+listType+"'";
        return `SELECT ${select} FROM ${from} WHERE ${dbClause} AND ${baseTable} `;
    }

    private async listViews(){
        var tables = [];
        let rows = await this.knex.raw(this.listFromDatabase(LIST_TYPE_VIEW));
        for (var key in rows[0]) {
            var item = rows[0][key];
            tables.push(item["tname"]);
        }
        return tables;      
    }

    /**
     * Lists all the tables in current database
     */
    private async listTables(): Promise<string[]> {
        var tables = [];
        let rows = await this.knex.raw(this.listFromDatabase(LIST_TYPE_TABLE));
        for (var key in rows[0]) {
            var item = rows[0][key];
            tables.push(item["tname"]);
        }
        return tables;
    }

    private async listColumns(tableName: string):Promise<DatabaseColumn[]> {
        return await this.knex.raw("SHOW COLUMNS FROM " + tableName).then(colData => colData[0]);
    }

    private getTsType(type: string): string  {
        var ts = this.mysql_types[type];
        if (!ts) {
            console.error("Unknown type " + type);
            ts = "any";
        }
        return ts;
    }

    private columnArrayToDatabaseSchema(colArrMap:{[key:string]:DatabaseColumn[]}) {
        var schema:DatabaseSchema = {};
        for (var tableName in colArrMap) {
            colArrMap[tableName] = colArrMap[tableName].map((col,i) => {
                col = ModelBuilder.objectToLowerCase<DatabaseColumn>(col);
                col.length = ModelBuilder.getMysqlLength(col.type);
                col.isPrimary = col.key == "PRI";
                col.index = i;
                col.type = ModelBuilder.stripMysqlLength(col.type);
                col.tsType = this.getTsType(col.type);
                return col;
            });
            var newTable :DatabaseTable = {};
            colArrMap[tableName].forEach(col => newTable[col.field] = col);
            schema[tableName] = newTable;
        }
        return schema;
    }

    async renderViewModel() : Promise<DatabaseSchema> {
        var tables = await this.listViews();
        var columnArrayMap: {[key:string]:DatabaseColumn[]} = {};
        var promises = tables.map(async function (tableName:string) {
            columnArrayMap[tableName] = await this.listColumns(tableName);
        });        
        await Promise.all(promises);
        return this.columnArrayToDatabaseSchema(columnArrayMap);
    }

    async renderTableModel() : Promise<DatabaseSchema> {
        //TODO list all in one query instead of one query per table
        var tables = await this.listTables();        
        var columnArrayMap: {[key:string]:DatabaseColumn[]} = {};
        var promises = tables.map(async function (tableName:string) {
            columnArrayMap[tableName] = await this.listColumns(tableName);
        });        
        await Promise.all(promises);
        return this.columnArrayToDatabaseSchema(columnArrayMap);
    }
}  
