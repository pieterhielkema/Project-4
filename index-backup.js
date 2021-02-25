var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(require('express').static('public'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

/* PARAMS */
const refreshRate = 25; // ms
const colors = ["#1abc9c", "#16a085", "#27ae60", "#2ecc71", "#3498db", "#9b59b6", "#34495e", "#2980b9", "#8e44ad", "#2c3e50", "#f1c40f", "#e67e22", "#e74c3c",
    "#95a5a6", "#f39c12", "#d35400", "#c0392b", "#bdc3c7", "#7f8c8d"];

/* INIT VARS */
var players = {};
var map = {
    height: 700,
    width: 1200,
    background: [
        {
            image: "assets/grass.jpg",
            start: {
                x: 0,
                y: 0,
            },
            end: {
                x: 700,
                y: 1200,
            }
        }
    ],
    balls: [],
    objects: [
        {
            color: 'red',
            x: 10,
            y: 10,
            width: 40,
            height: 40,
            userCallback: (player) => {
                player.health -= 1;
                return true;
            }
        },
        {
            color: 'green',
            x: 200,
            y: 10,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            userCallback: (player) => {
                player.health += 20;
                return true;
            }
        },
        {
            color: 'green',
            x: 200,
            y: 400,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            userCallback: (player) => {
                player.health += 20;
                return true;
            }
        },
        {
            color: 'green',
            x: 1000,
            y: 600,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            userCallback: (player) => {
                player.health += 20;
                return true;
            }
        },
        {
            color: 'gold',
            x: 1050,
            y: 650,
            width: 40,
            height: 40,
            deleteAfterUse: false,
            userCallback: (player) => {
                player.health += 5;
                return true;
            }
        },
        {
            color: 'blue',
            x: 1100,
            y: 400,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            userCallback: (player) => {
                player.distance += 2;
                return true;
            }
        },
        {
            color: 'black',
            x: 300,
            y: 400,
            width: 500,
            height: 40,
            deleteAfterUse: false,
            userCallback: () => false
        }
    ]
};

/*
 * Update players all the time
 */
setInterval(() => {
    io.emit('updatePlayers', players);
}, refreshRate);

/*
 * User related stuff
 */
io.on('connection', function(socket){
    /*
     * Initialize user
     */
    console.log('a user connected');

    var _moveFunction;

    // Send map
    console.log('Map created');
    io.emit('updateMap', map);

    /*
     * Add player to the map
     */
    console.log('Player added');
    players[socket.id] = {
        x: 100,
        y: 100,
        id: socket.id,
        health: 100,
        lookingDirection: 0,
        distance: 5,
        color: colors[Math.floor(Math.random() * colors.length)]
    };
    io.emit('updatePlayers', players);

    // Update self every x
    setInterval(() => {
        socket.emit('updateMe', players[socket.id]);
    }, refreshRate * 10);

    /*
     * Move player somewhere
     */
    socket.on('move', function(moveKeys){
        clearInterval(_moveFunction);
        if(moveKeys.up || moveKeys.right || moveKeys.down || moveKeys.left) {
            _moveFunction = setInterval(() => {
                if(players[socket.id] === undefined)
                    return;

                // Check if player can go there, if true just go :)
                if(tryToGoTo(
                    players[socket.id],
                    players[socket.id].x + (moveKeys.left ? -2 : 0) + (moveKeys.right ? 2 : 0),
                    players[socket.id].y + (moveKeys.up ? -2 : 0) + (moveKeys.down ? 2 : 0)
                )) {
                    players[socket.id].x += (moveKeys.left ? -2 : 0) + (moveKeys.right ? 2 : 0);
                    players[socket.id].y += (moveKeys.up ? -2 : 0) + (moveKeys.down ? 2 : 0);
                }
            }, 10);
        }
    });

    /*
     * Change looking direction of player
     */
    socket.on('look', function(lookingDirection) {
        players[socket.id].lookingDirection = lookingDirection;
    });

    /*
     * Shoot a ball to someone
     */
    socket.on('shoot', function() {
        shootBall(players[socket.id]);
    });

    /*
     * remove all resources on disconnect
     */
    socket.on('disconnect', function(){
        console.log('user disconnected');
        clearInterval(_moveFunction);
        delete players[socket.id];
    });
});

function tryToGoTo(player, x, y) {
    // Can't go off the map
    if(x < 25 || y < 25 || x > (map.width - 25) || y > (map.height - 25))
        return false;

    // Try to find a collision object
    const object = map.objects.find(obj => {
        return x > obj.x && x < (obj.x + obj.width)
        && y > obj.y && y < (obj.y + obj.height);
    });

    if(object !== undefined) {
        const result =  object.userCallback(player);

        if(object.deleteAfterUse !== undefined && object.deleteAfterUse === true) {
            map.objects = map.objects.filter(x => x !== object);
            io.emit('updateMap', map);
        }

        return result;
    }
    return true;
}

function shootBall(player) {
    let ball = {
        color: 'orange',
        x: player.x,
        y: player.y,
        width: 10,
        height: 10,
        deleteAfterUse: true,
        userCallback: (player) => {
            player.health = player.health - 1;
            return true;
        }
    };
    map.balls.push(ball);
    io.emit('updateBalls', map.balls);

    let i = 0;
    setInterval(() => {
        if(player.lookingDirection >= 0 && player.lookingDirection < 90) {
            ball.x += (player.lookingDirection % 90) / (refreshRate / 12);
            ball.y += -(90 - (player.lookingDirection % 90)) / (refreshRate / 12);
        } else if(player.lookingDirection >= 90 && player.lookingDirection < 180) {
            ball.x += (90 - (player.lookingDirection % 90)) / (refreshRate / 12);
            ball.y += (player.lookingDirection % 90) / (refreshRate / 12);
        } else if(player.lookingDirection >= 180 && player.lookingDirection < 270) {
            ball.x += -(player.lookingDirection % 90) / (refreshRate / 12);
            ball.y += (90 - (player.lookingDirection % 90)) / (refreshRate / 12);
        } else if(player.lookingDirection >= 270 && player.lookingDirection < 360) {
            ball.x += -(90 - (player.lookingDirection % 90)) / (refreshRate / 12);
            ball.y += -(player.lookingDirection % 90) / (refreshRate / 12);
        }

        io.emit('updateMap', map);

        // Stop when its done
        i++;
        if(i > player.distance) {
            map.balls = map.balls.filter(x => x !== ball);
            clearInterval(this);
        }
    }, refreshRate);
}







http.listen(port, function(){
    console.log('listening on *:' + port);
});












































var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(require('express').static('public'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

/* PARAMS */
const refreshRate = 25; // ms
const colors = ["#1abc9c", "#16a085", "#27ae60", "#2ecc71", "#3498db", "#9b59b6", "#34495e", "#2980b9", "#8e44ad", "#2c3e50", "#f1c40f", "#e67e22", "#e74c3c",
    "#95a5a6", "#f39c12", "#d35400", "#c0392b", "#bdc3c7", "#7f8c8d"];

/* INIT VARS */
var map = {
    height: 700,
    width: 1200,
    background: [
        {
            image: "assets/grass.jpg",
            start: {
                x: 0,
                y: 0,
            },
            end: {
                x: 700,
                y: 1200,
            }
        }
    ],
    objects: [
        {
            color: 'red',
            x: 10,
            y: 10,
            width: 40,
            height: 40,
            onUserInteraction: (player) => {
                player.health -= 1;
            }
        },
        {
            color: 'green',
            x: 200,
            y: 10,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            onUserInteraction: (player) => {
                player.health += 20;
            }
        },
        {
            color: 'green',
            x: 200,
            y: 400,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            onUserInteraction: (player) => {
                player.health += 20;
            }
        },
        {
            color: 'green',
            x: 1000,
            y: 600,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            onUserInteraction: (player) => {
                player.health += 20;
            }
        },
        {
            color: 'gold',
            x: 1050,
            y: 650,
            width: 40,
            height: 40,
            deleteAfterUse: false,
            onUserInteraction: (player) => {
                player.health += 5;
            }
        },
        {
            color: 'blue',
            x: 1100,
            y: 400,
            width: 40,
            height: 40,
            deleteAfterUse: true,
            onUserInteraction: (player) => {
                player.distance += 2;
            }
        },
        {
            color: 'black',
            x: 300,
            y: 400,
            width: 500,
            height: 40,
            deleteAfterUse: false,
            canWalkThrough: false,
        }
    ],
    movingObjects: [],
    players: {},
};

/*
 * Main Loop
 */
setInterval(() => {
    Object.keys(map.players).forEach(key => {
        const player = map.players[key];

        player.callback(player);

        // Check for collision with objects
        const object = map.objects.find(obj => {
            // return player.x > obj.x && player.x < (obj.x + obj.width)
            //     && player.y > obj.y && player.y < (obj.y + obj.height);
            //
            return player.x < obj.x + obj.width &&
                player.x + player.width > obj.x &&
                player.y < obj.y + obj.height &&
                player.y + player.height > obj.y;
        });
        if(object !== undefined) {
            object.onUserInteraction(player);

            if(object.deleteAfterUse !== undefined && object.deleteAfterUse === true)
                map.objects = map.objects.filter(x => x !== object);
        }

        // Check for collision with moving objects
        const movingObject = map.movingObjects.find(obj => {
            // return player.x > obj.x && player.x < (obj.x + obj.width)
            //     && player.y > obj.y && player.y < (obj.y + obj.height);
            return player.x < obj.x + obj.width &&
                player.x + player.width > obj.x &&
                player.y < obj.y + obj.height &&
                player.y + player.height > obj.y;
        });
        if(movingObject !== undefined) {
            movingObject.onUserInteraction(player);

            if(movingObject.deleteAfterUse !== undefined && movingObject.deleteAfterUse === true)
                map.movingObjects = map.movingObjects.filter(x => x !== movingObject);
        }
    });
    map.movingObjects.forEach(object => object.callback(object));
    io.emit('updateMap', map);
}, refreshRate);

/*
 * User related stuff
 */
io.on('connection', function(socket){
    /*
     * Initialize user
     */
    console.log('a user connected');

    // Send map
    console.log('Map created');
    io.emit('updateMap', map);

    /*
     * Add player to the map
     */
    console.log('Player added');
    map.players[socket.id] = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        id: socket.id,
        health: 100,
        lookingDirection: 0,
        distance: 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        moveKeys: null,
        callback: (player) => {
            if(player.moveKeys === null || player.moveKeys === undefined)
                return;

            if(tryToGoTo(
                player,
                player.x + (player.moveKeys.left ? -2 : 0) + (player.moveKeys.right ? 2 : 0),
                player.y + (player.moveKeys.up ? -2 : 0) + (player.moveKeys.down ? 2 : 0)
            )) {
                player.x += (player.moveKeys.left ? -2 : 0) + (player.moveKeys.right ? 2 : 0);
                player.y += (player.moveKeys.up ? -2 : 0) + (player.moveKeys.down ? 2 : 0);
            }
        }
    };
    console.log("Player count: " + Object.keys(map.players).length);

    // Update self every x
    setInterval(() => {
        socket.emit('updateMe', map.players[socket.id]);
    }, refreshRate * 10);

    /*
     * Move player somewhere
     */
    socket.on('move', function(moveKeys){
        map.players[socket.id].moveKeys = moveKeys;
    });

    /*
     * Change looking direction of player
     */
    socket.on('look', function(lookingDirection) {
        map.players[socket.id].lookingDirection = lookingDirection;
    });

    /*
     * Shoot a ball to someone
     */
    socket.on('shoot', function() {
        map.movingObjects.push({
            x: map.players[socket.id].x,
            y: map.players[socket.id].y,
            width: 10,
            height: 10,
            color: 'orange',
            params: {
                i: 0,
                distance: map.players[socket.id].distance,
                direction: map.players[socket.id].lookingDirection
            },
            callback: (ball) => {
                const direction = ball.params.direction;
                if(direction >= 0 && direction < 90) {
                    ball.x += (direction % 90) / (refreshRate / 12);
                    ball.y += -(90 - (direction % 90)) / (refreshRate / 12);
                } else if(direction >= 90 && direction < 180) {
                    ball.x += (90 - (direction % 90)) / (refreshRate / 12);
                    ball.y += (direction % 90) / (refreshRate / 12);
                } else if(direction >= 180 && direction < 270) {
                    ball.x += -(direction % 90) / (refreshRate / 12);
                    ball.y += (90 - (direction % 90)) / (refreshRate / 12);
                } else if(direction >= 270 && direction < 360) {
                    ball.x += -(90 - (direction % 90)) / (refreshRate / 12);
                    ball.y += -(direction % 90) / (refreshRate / 12);
                }

                ball.params.i++;
                if(ball.params.i > ball.params.distance) {
                    map.movingObjects = map.movingObjects.filter(x => x !== ball);
                }
            },
            deleteAfterUse: true,
            onUserInteraction(player) {
                player.health -= 10;
                console.log("HIT!");
            }
        });
    });

    /*
     * remove all resources on disconnect
     */
    socket.on('disconnect', function(){
        console.log('user disconnected');
        delete map.players[socket.id];
        console.log("Player count: " + Object.keys(map.players).length);
    });
});

function tryToGoTo(player, x, y) {
    // Can't go off the map
    if(x < 25 || y < 25 || x > (map.width - 25) || y > (map.height - 25))
        return false;

    // Try to find a collision object
    const object = map.objects.find(obj => {
        return x > obj.x && x < (obj.x + obj.width)
            && y > obj.y && y < (obj.y + obj.height);
    });
    if(object !== undefined) {
        return object.canWalkThrough !== undefined ? object.canWalkThrough : true;
    }

    // Return true if nothing happends
    return true;
}

http.listen(port, function(){
    console.log('listening on *:' + port);
});