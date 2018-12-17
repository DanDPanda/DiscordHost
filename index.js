var ngrok = require("ngrok");
const mysql = require("mysql");
require("dotenv").config();
let baby = 0;

// Connect to the database
var database = mysql.createConnection({
  host: process.env.SQLHOST,
  user: process.env.SQLUSER,
  password: process.env.SQLPASS,
  database: process.env.SQLDB,
  pingInterval: 60000
});

// Creates the ngrok connection
(async function() {
  const url = await ngrok.connect(9007);
  database.query("UPDATE ngrok SET url = ?;", [url]);
  database.query("UPDATE ngrok SET online = 0;");
  console.log(url);
  console.log("SSH is turned off by default.");
})();

// This checks every minute to see if the SSH in the DB is turned on.
// If it is turned on in the DB, it will turn on within one minute.
setInterval(function() {
  database.query("SELECT * FROM ngrok", (err, rows) => {
    if (baby == 0 && rows[0].online == 1) {
      (async function() {
        await ngrok.authtoken(process.env.NGROK);
        const sshurl = await ngrok.connect({
          authtoken: process.env.NGROK,
          proto: process.env.PROTOCOL,
          addr: process.env.ADDRESS
        });
        console.log("SSH Online");
        console.log(sshurl);
        baby = 1;
        database.query("UPDATE ngrok SET ssh = ?;", [sshurl]);
      })();
    } else if (baby == 1 && rows[0].online == 0) {
      database.query("SELECT ssh FROM ngrok", (err, rows) => {
        ngrok.disconnect(rows[0].ssh);
        console.log("SSH Offline");
        baby = 0;
      });
    }
  });
}, 60000);
