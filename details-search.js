//For games details only not main page. Results rendered to games-2.hbs

//SQL statements
const SQL_GAME_WHERE_PAGE = 
    'select * from game where name like ?';
const SQL_COMMENT_GAME = 'select user, rating, c_text, gid from comment where gid = ? limit ? offset ?' ;

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

const commentGame = (params, conn) => {
    const p = new Promise((resolve, reject) => {
        conn.query(SQL_COMMENT_GAME, params,
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
    const limit = parseInt(req.query.limit) || 1;
    const offset = parseInt(req.query.offset) || 0

    console.log('q: ', q);
  
    //Checkout a connection from the pool
    getConnection(pool)
        .then(conn => {
            return (Promise.all([
                selectGame([ `%${q}%`], conn),
                commentGame([386, limit, offset], conn), // testing only; to get comment for gid = 386
            ]))
            
        })
        .then(result => {
            const data = result[0][0];
            const comment = result[1][0];
            const conn = result[1][1];
            resp.status(200);
            resp.type('text/html');
            resp.render('games-2', {  //games-2.hbs
                games: data,
                noResult: data.length <= 0, 
                q: q,
                comments: comment,
                next_offset: (offset + limit), 
                prev_offset: (offset - limit), 
                layout: false 
            });
            conn.release();
            //console.log(result);
            console.log(result[0][0].gid);
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

console.log()
app.get(/.*/, express.static(__dirname + '/public')) // serve html file in public directory

app.listen(PORT, () => {
    console.info(`Application started on port ${PORT} at ${new Date()}`);
});