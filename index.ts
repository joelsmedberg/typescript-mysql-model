import ModelBuilder from "./lib/model-builder";
import TsBuilder from  "./lib/ts-builder";
import TypedInserter from  "./lib/typed-inserter";
import * as DatabaseDefinition from "./lib/mysql-database-definition";
export {TsBuilder, ModelBuilder, TypedInserter, DatabaseDefinition};


// console.log("test");
// import Database from "./test/Database";
// // import StoredProcedures from "./lib/stored-procedures";
// import SpBuilder from "./lib/sp-builder";

// let modelBuilder = new ModelBuilder(Database.getKnexInstance());
// modelBuilder.renderDatabaseSchema().then(function(resp){
//   let tsBuilder = new TsBuilder();  
//   let spBuilder = new SpBuilder(resp.storedProcedures,tsBuilder.mysqlTypes);
//   spBuilder.renderTemplate();
  
//   tsBuilder.init(Database.getKnexInstance()).then


// });
// // let sp = new StoredProcedures(Database.getKnexInstance());
// // sp.callSp("sp_orders_stat_left_menu",20,"joel");

//   // let modelBuilder = new ModelBuilder(Database.getKnexInstance());
//   // modelBuilder.renderDatabaseSchema();