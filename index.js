import express from 'express';
import * as httpJs from 'http';
import Server from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

var port = process.env.PORT || 3000;
const app = express();
var http = httpJs.createServer(app);
var io = new Server(http);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fourGame from './game.js';

/* Allow public folder to be accessed */
app.use(express.static('public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});
app.get('/3d', function(req, res){
	res.sendFile(__dirname + '/3d.html');
});


/*
 * Main Loop
 */
fourGame.loopCallback = () => { io.emit('updateMap', fourGame.map); }
fourGame.startGame();

/*
 * User related stuff
 */
io.on('connection', function(socket){
    // Send map to user
    console.log('User connected');
	socket.emit('updateMap', fourGame.map);

	/*
	 * Add player to the map
	 */
	console.log('Player added');
    const player = fourGame.addPlayerForSocketId(socket.id);
	console.log("Player count: " + Object.keys(fourGame.map.players).length);

    setInterval(() => { socket.emit('updateMe', player); }, 10);

	/*
	 * Set name of the player (socket)
	 */
	socket.on('setName', function(name) {
		fourGame.setNameForSocketId(socket.id, name);
	});

	/*
	 * Move player somewhere
	 */
	socket.on('move', function(moveKeys){
        fourGame.movePlayer(socket.id, moveKeys);
	});

	/*
	 * Change looking direction of player
	 */
	socket.on('look', function(lookingDirection) {
        fourGame.setPlayerLookingDirection(socket.id, lookingDirection);
	});

	/*
	 * Shoot a ball to someone
	 */
	socket.on('shoot', function() {
	    fourGame.shoot(socket.id);
	});

	/*
	 * remove all resources on disconnect
	 */
	socket.on('disconnect', function(){
		console.log('user disconnected');
        fourGame.removePlayer(socket.id);
		console.log("Player count: " + Object.keys(fourGame.map.players).length);
	});
});

http.listen(port, function(){
	console.log('listening on *:' + port);
});