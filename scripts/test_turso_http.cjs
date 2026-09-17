const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('camilleros.db');

db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, tables) => {
  console.log('Tablas en camilleros.db:', tables);
  if (tables && tables.length > 0) {
    tables.forEach(t => {
      db.all(`SELECT count(*) as total FROM ${t.name}`, (e, res) => {
        console.log(`Tabla ${t.name}:`, res);
      });
    });
  }
});
