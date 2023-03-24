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

/* Import colors and objects */
import colors from './colors.js';
import getObjectTemplates from './objects.js';

/* Allow public folder to be accessed */
app.use(express.static('public'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});
app.get('/3d', function(req, res){
	res.sendFile(__dirname + '/3d.html');
});

/* PARAMS */
const refreshRate = 10; // ms

/* INIT VARS */
const map = {
	height: 2000,
	width: 2000,
	objects: [],
	players: {},
};
const names = {};

/*
 * New items loop
 */
setInterval(() => {
    var objects = getObjectTemplates();
    const randomInt = Math.floor(Math.random() * Math.floor(objects.length));
    var newObject = objects[randomInt];
    newObject.x = 50 + Math.floor(Math.random() * Math.floor(map.width - 100));
    newObject.y = 50 + Math.floor(Math.random() * Math.floor(map.height - 100));
	map.objects.push(newObject);
}, 1000);

/*
 * Main Loop
 */
setInterval(() => {
	Object.keys(map.players).forEach(key => {
		const player = map.players[key];

		if(player.health <= 0)
			delete map.players[key];

		player.callback(player);

		// Check for collision with objects
		const object = map.objects.find(obj => {
			return player.x < obj.x + obj.width &&
				player.x + player.width > obj.x &&
				player.y < obj.y + obj.height &&
				player.y + player.height > obj.y;
		});

        // If collision, call the callback / Delete if needed
		if(object !== undefined && object.sender !== player) {
			if(object.onUserInteraction !== undefined)
				object.onUserInteraction(player);

			if(object.deleteAfterUse !== undefined && object.deleteAfterUse === true)
				map.objects = map.objects.filter(x => x !== object);
		}
	});

	map.objects.forEach(object => {
		if(object.callback !== undefined)
			object.callback(object, map)
	});

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
		name: names[socket.id],
		x: 100 + Math.floor(Math.random() * Math.floor(map.width - 200)),
		y: 100 + Math.floor(Math.random() * Math.floor(map.height - 200)),
		width: 50,
		height: 50,
		id: socket.id,
		health: 100,
		lookingDirection: 0,
		distance: 3,
		balls: {
			regular: 25,
		},
		color: colors[Math.floor(Math.random() * colors.length)],
		moveKeys: null,
		callback: (player) => {
			if(player.moveKeys === null || player.moveKeys === undefined)
				return;

			if(player.moveKeys.up !== true)
				return;

			const x = Math.cos((player.lookingDirection - 90) * Math.PI / 180) * 4;
			const y = Math.sin((player.lookingDirection - 90) * Math.PI / 180) * 4;

			if(tryToGoTo(
				player,
				player.x + x,
				player.y + y
			)) {
				player.x += x;
				player.y += y;
			}
		}
	};
	console.log("Player count: " + Object.keys(map.players).length);

	// Update self every x
	setInterval(() => {
		if(map.players[socket.id] === undefined) {
			socket.emit('updateMe', null);
			return;
		}
		socket.emit('updateMe', map.players[socket.id]);
	}, refreshRate * 10);

	/*
	 * Set name of the player (socket)
	 */
	socket.on('setName', function(name) {
		names[socket.id] = name;

		if(map.players[socket.id] === undefined)
			return;

		map.players[socket.id].name = name;
	});

	/*
	 * Move player somewhere
	 */
	socket.on('move', function(moveKeys){
		if(map.players[socket.id] === undefined)
			return;

		map.players[socket.id].moveKeys = moveKeys;
	});

	/*
	 * Change looking direction of player
	 */
	socket.on('look', function(lookingDirection) {
		if(map.players[socket.id] === undefined)
			return;

		map.players[socket.id].lookingDirection = lookingDirection;
	});

	/*
	 * Shoot a ball to someone
	 */
	socket.on('shoot', function() {
		if(map.players[socket.id] === undefined)
			return;

		if(map.players[socket.id].balls.regular < 1)
			return;

		map.players[socket.id].balls.regular--;

		map.objects.push({
			x: map.players[socket.id].x + (map.players[socket.id].width / 2),
			y: map.players[socket.id].y + (map.players[socket.id].height / 2),
			width: 10,
			height: 10,
			color: 'orange',
			sender: map.players[socket.id],
			params: {
				i: 0,
				distance: map.players[socket.id].distance,
				direction: map.players[socket.id].lookingDirection
			},
			deleteAfterUse: true,
			callback: (ball) => {
				const direction = ball.params.direction - 90;
				ball.x += Math.cos(direction * Math.PI / 180) * 50;
				ball.y += Math.sin(direction * Math.PI / 180) * 50;

				ball.params.i++;
				if(ball.params.i > ball.params.distance) {
					map.objects = map.objects.filter(x => x !== ball);
				}
			},
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

		if(names[socket.id] === undefined)
			return;

		delete names[socket.id];
	});
});

function tryToGoTo(player, x, y) {
	// Can't go off the map
	if(x < 0 || y < 0 || x > (map.width - 50) || y > (map.height - 50))
		return false;

	// Try to find a collision object
	const object = map.objects.find(obj => {
		return player.x < obj.x + obj.width &&
			player.x + player.width > obj.x &&
			player.y < obj.y + obj.height &&
			player.y + player.height > obj.y;
	});
	if(object !== undefined) {
		return object.canWalkThrough !== undefined ? object.canWalkThrough : true;
	}

	// Return true if nothing happens
	return true;
}

http.listen(port, function(){
	console.log('listening on *:' + port);
});