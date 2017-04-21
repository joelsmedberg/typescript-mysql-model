// import { DatabaseColumn, DatabaseTable, DatabaseSchema } from "./MysqlDatabaseDefinition";
// import ModelBuilder from "./model-builder";
// import {format} from 'util';
// import Knex = require('knex');

// /**
//  * This class serves as a data access object and allowes communication with the mysql server
//  * MUST CALL INIT BEFORE USE!
//  * It automatically strips away attributes that not match columns
//  */
// export default class TypedInserter {
//     constructor(private knex:Knex, private dbModel:DatabaseSchema){

//     }

//     async batchInsert<T>(tableName:string, rows:T[]):Promise<void> {
//         for (var i = 0; i < rows.length; i++) {
//             rows[i] = this.stripNoneBelonging(this.dbModel[tableName], rows[i]);
//         }
//         var knex: any = this.knex; //batchInsert is not in definition file        
//         await knex.batchInsert(tableName, rows);
//     }

//     async batchInsertIgnore<T>(tableName:string, rows:T[]):Promise<void> {
//         for (let item of rows) {
//             await this.insertIgnore(tableName, item);
//         }
//     }

//     async batchUpdate<T>(tableName:string, data:T[]):Promise<void> {
//         if (data) {
//             let i = 0;
//             for (let item of data) {
//                 await this.update(tableName, item);
//             }
//         }
//     };

//     /*** 
//      * @param tableName
//      * @param object
//      * Replaces all tinyint columns with a boolean
//      */    
//     private boolfix<T>(tableName: string, object:T):T {
//         var table = this.dbModel[tableName];
//         const BOOL_TYPE = "tinyint";
//         for (var key in table) {
//             if (table[key].type == BOOL_TYPE) {
//                 object[key] = !!object[key];
//             }
//         }
//         return object;
//     };

//     /**
//     Returns the same object with all date fields
//     strings parsed into date objects
//     */
//     private datefix<T>(tableName:string, object:T):T {
//         var table = this.dbModel[tableName];
//         const DATE_TYPE = "date";
//         for (var key in table) {
//             var col = table[key];
//             if (col.type == DATE_TYPE && object[key]) {
//                 var value:Date = object[key];
//                 var isoStr = value.toISOString();
//                 object[key] = isoStr.substring(0, 10);
//             }
//         }
//         return object;
//     };

//     /**
//      * return true if object has its primary key among its items
//      * @param tableName
//      * @param data
//      */
//     hasPrimaryKey<T>(tableName: string, data:T):boolean {
//         return !!(data[this.getPrimaryKey(tableName)]);
//     };

//     private async insert<T>(tableName: string, data: T): Promise<T> {   
//         var reply = await this.knex(tableName).insert(data);
//         data[this.getPrimaryKey(tableName)] = reply[0];
//         return data;
//     };

//     /**
//      * Insert an object, if it exist, then silentely ignore and continue
//      * @param tableName
//      * @param item
//      */
//     async insertIgnore<T>(tableName: string, item:T):Promise<void> {
//         var table = this.dbModel[tableName];
//         item = this.stripNoneBelonging(table, item);
//         var qry = this.knex(tableName).insert(item).toString();
//         qry = qry.replace("insert", "INSERT IGNORE");
//         await this.knex.raw(qry).then(a=>a);
//     };

//     async insertOnDuplicateUpdate<T>(tableName: string, data:T) :Promise<T> {
//         var filtered = this.stripNoneBelonging(this.dbModel[tableName], data);
//         let insert = this.knex(tableName).insert(filtered);
//         filtered = this.removePrimaryKeys(tableName, filtered);        
//         let update = this.knex(tableName).update(filtered);
//         let middle = '%s on duplicate key update %s';
//         let lastPart = update.toString().replace(/^update `[^`]+` set /i, '');
//         let query = format(middle, insert.toString(), lastPart);
//         var rows = await this.knex.raw(query).then(rows => rows);
//         return rows;
//     }

//     /**
//      * @param tableName 
//      * @param data
//      * @param forceInsert
//      * Insert an object that already has its primary key among its variables
//      */
//     async insertWithPrimaryKey<T>(tableName:string, data:T, forceInsert?:boolean):Promise<T> {
//         data = this.stripNoneBelonging(this.dbModel[tableName], data);        
//         if (Object.keys(data).length > 2 || forceInsert) {
//            await this.knex(tableName).insert(data);
//         }        
//         return data;
//     }

//     /**
//      * returns true if the first primary key column is of type int
//      * @param tableName
//      */
//     isIntPk(tableName: string): boolean {
//         var pks = this.getPkCols(tableName);
//         if (pks.length > 0)
//             return pks[0].type == "int";
//         return false;
//     }

//     private getPkCols(tableName:string):DatabaseColumn[] {
//         if (!tableName) return null;
//         var cols: DatabaseColumn[] = [];
//         var table = this.dbModel[tableName];
//         for (var key in table) {
//             if (table[key].isPrimary) {
//                 cols.push(table[key]);
//             }
//         }
//         return cols;
//     }

//     /**
//      * List the names of all primary keys in a table
//      * @param tableName
//      */
//     private getPrimaryKeyNames(tableName:string):string[] {
//         var cols = this.getPkCols(tableName);
//         if (!cols || cols.length == 0) return null;
//         var keys:string[] = [];
//         for (var i = 0; i < cols.length; i++) {
//             keys.push(cols[i].field);
//         }
//         return keys;
//     }

//     /**
//      * Returns the name of the first primary key column
//      * @param tableName
//      */
//     getPrimaryKey(tableName: string):string {
//         var cols = this.getPkCols(tableName);
//         if (cols == null) return "";
//         if (cols.length == 0) return null;
//         return cols[0].field;
//     }

//     /**
//      * @param tableName
//      * @param data
//      * Return a copy of the object without any primary keys
//      */
//     removePrimaryKeys<T>(tableName: string, data: T): T {
//         var filtered = JSON.parse(JSON.stringify(data)); //copy
//         var pks = this.getPrimaryKeyNames(tableName);
//         for (var i = 0; i < pks.length; i++) {
//             var pk = pks[i];
//             delete filtered[pk];
//         }
//         return filtered;
//     }

//     /**
//      * Insert but if the object exists throw the other one away.
//      * @param tableName
//      * @param item
//      */
//     async replaceInto<T>(tableName:string, item:T):Promise<void> {
//         item = this.stripNoneBelonging(this.dbModel[tableName], item);
//         var qry = this.knex(tableName).insert(item).toString();
//         qry = qry.replace("insert", "replace");
//         await this.knex.raw(qry).then(a => a);
//     };

//     /**
//      * Update or insert a data objet.
//      * Update if object has a primary key already.
//      * To insert an object with a primary key, use the other function
//      * @param tableName
//      * @param data
//      */
//     async setData<T>(tableName:string, data:T):Promise<T> {
//         data = this.stripNoneBelonging(this.dbModel[tableName], data);
//         if (this.hasPrimaryKey(tableName, data)) {
//             //update existing 
//             var pk = this.getPrimaryKey(tableName);
//             var pkValue = data[pk];
//             return this.update(tableName, data).then(function (reply) {
//                 data[pk] = pkValue;
//                 return data;
//             });
//         } else {
//             //new object, insert
//             return this.insert(tableName, data);
//         }
//     }

//     /**
//      * return a new object where with only attributes that have
//      * a corresponding column for given table
//      * @param table
//      * @param data
//      */
//     private stripNoneBelonging<T>(table: DatabaseTable, data:T): T {
//         var copy = {} as any;
//         for (var key in data) {
//             if (table[key])
//                 copy[key] = data[key];
//         }
//         return copy;
//     }

//     async forceUpdate<T>(tableName: string, data: T): Promise<T> {
//         data = this.stripNoneBelonging(this.dbModel[tableName], data);
//         return await this.update(tableName, data);
//     }

//     private async update<T>(tableName:string, data:T):Promise<T> {
//         var pks = this.getPrimaryKeyNames(tableName);
//         var criterions = {};        
//         for (var i = 0; i < pks.length; i++) {
//             var pk = pks[i];
//             criterions[pk] = data[pk];
//             delete data[pk];
//         }
//         if (Object.keys(data).length > 0) {
//             await this.knex(tableName).where(criterions).update(data);
//         }
//         return data;
//     }
// }