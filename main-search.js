// this js file only provides for the main seach by name of games.
//for game details, pls refer to details-search.js

//SQL statements
const SQL_GAME_WHERE_PAGE = 
    'select * from game where name like ?';
const SQL_COUNT_GAME = 'select count(*) as game_count from game where name like ?';

//Load the libraries
const express = require('express');
const hbs = require('express-handlebars');
const mysql = require('mysql');
const config = require('./config.json');

//Configure PORT
const PORT = parseInt(process.argv[2] || process.env.APP_PORT || 3000);

//Create an MySQL connection pool
const pool = mysql.createPool(config.bgg);


//Promises
const getConnection = (pool) => {
    const p = new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err)
                reject(err);
            else
                resolve(conn);
        });
    })
    return (p);
}
const selectGame = (params, conn) => {
    const p = new Promise((resolve, reject) => {
        conn.query(SQL_GAME_WHERE_PAGE, params,
            (err, result) => {
                if (err)
                    reject(err);
                else
                    resolve([result, conn]);
            }
        )
    })
    return (p);
}

const countGame = (params, conn) => {
    const p = new Promise((resolve, reject) => {
        conn.query(SQL_COUNT_GAME, params,
            (err, result) => {
                if (err)
                    reject(err);
                else
                resolve([result, conn]);
            }
        )
    });
    return (p);
}

//Create an instance of the application
const app = express();

//Configure handlebars
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
//Optional; views is the default directory
app.set('views', __dirname + '/views');

//Routes
app.get('/search', (req, resp) => { // '/search' is new path where the result page will be directed to
    const q = req.query.q;
  
    console.log('q: ', q);
  
    //Checkout a connection from the pool
    getConnection(pool)
        .then(conn => {
            return (Promise.all([
                selectGame([ `%${q}%`], conn),
                countGame([ `%${q}%` ], conn),
            ]))
            
        })
        .then(result => {
            const data = result[0][0];
            const count = result[1][0];
            const conn = result[1][1];
            resp.status(200);
            resp.type('text/html');
            resp.render('games', {  //games.hbs
                games: data,
                noResult: data.length <= 0, 
                q: q,
                count: count[0].game_count,
                layout: false 
            });
            conn.release();
            //console.log(result);
            //console.log(result[0][0]);
            //console.log(result[1][0]);
            //console.log(result[0][1]);
            //console.log(result[1][1]);
        })
        .catch(err => {
            resp.status(500);
            resp.type('text/plain');
            resp.send(err);
        })
    }
);

app.get(/.*/, express.static(__dirname + '/public')) // serve html file in public directory

app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
});