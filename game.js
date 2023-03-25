import getObjectTemplates from "./objects.js";
import colors from "./colors.js";

export default {
    /*
     *  Game settings
     */
    refreshRate: 10,
    map: {
        height: 2000,
        width: 2000,
        objects: [],
        players: {},
    },
    names: {},
    colors: colors,

    /*
     *  Callbacks
     */
    loopCallback: null,

    /*
     *  Start game
     */
    startGame() {
        setInterval(() => {
            this.mainLoop();
            this.up
        }, this.refreshRate);
        setInterval(() => {
            this.generateObjectsLoop();
        }, this.refreshRate * 100);
    },

    /*
     *  Game loop
     */
    mainLoop() {
        Object.keys(this.map.players).forEach(key => {
            const player = this.map.players[key];

            if(player.health <= 0)
                delete this.map.players[key];

            player.callback(player);

            // Check for collision with objects
            const object = this.map.objects.find(obj => {
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
                    this.map.objects = this.map.objects.filter(x => x !== object);
            }
        });

        this.map.objects.forEach(object => {
            if(object.callback !== undefined)
                object.callback(object, this.map)
        });

        if(this.loopCallback !== null)
            this.loopCallback();
    },
    generateObjectsLoop() {
        var objects = getObjectTemplates();
        const randomInt = Math.floor(Math.random() * Math.floor(objects.length));
        var newObject = objects[randomInt];
        newObject.x = 50 + Math.floor(Math.random() * Math.floor(this.map.width - 100));
        newObject.y = 50 + Math.floor(Math.random() * Math.floor(this.map.height - 100));
        this.map.objects.push(newObject);
    },

    /*
     *  Game functions
     */
    addPlayerForSocketId(socketId) {
        const player = this.map.players[socketId] = {
            name: this.names[socketId] ?? "Player",
            x: 100 + Math.floor(Math.random() * Math.floor(this.map.width - 200)),
            y: 100 + Math.floor(Math.random() * Math.floor(this.map.height - 200)),
            width: 50,
            height: 50,
            id: socketId,
            health: 100,
            lookingDirection: 0,
            distance: 3,
            balls: {
                regular: 25,
            },
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            moveKeys: null,
            callback: (player) => {
                if(player.moveKeys === null || player.moveKeys === undefined)
                    return;

                if(player.moveKeys.up !== true)
                    return;

                const x = Math.cos((player.lookingDirection - 90) * Math.PI / 180) * 4;
                const y = Math.sin((player.lookingDirection - 90) * Math.PI / 180) * 4;

                if(this.canPlayerGoTo(
                    player,
                    player.x + x,
                    player.y + y
                )) {
                    player.x += x;
                    player.y += y;
                }
            },
        };
        return player;
    },
    setNameForSocketId(socketId, name) {
        this.names[socketId] = name;
    },
    movePlayer(socketId, moveKeys) {
        this.map.players[socketId].moveKeys = moveKeys;
    },
    setPlayerLookingDirection(socketId, lookingDirection) {
        this.map.players[socketId].lookingDirection = lookingDirection;
    },
    shoot(socketId) {
        if(this.map.players[socketId].balls.regular < 1)
            return;

        this.map.players[socketId].balls.regular--;

        this.map.objects.push({
            x: this.map.players[socketId].x + (this.map.players[socketId].width / 2),
            y: this.map.players[socketId].y + (this.map.players[socketId].height / 2),
            width: 10,
            height: 10,
            color: 'orange',
            sender: this.map.players[socketId],
            params: {
                i: 0,
                distance: this.map.players[socketId].distance,
                direction: this.map.players[socketId].lookingDirection
            },
            deleteAfterUse: true,
            callback: (ball) => {
                const direction = ball.params.direction - 90;
                ball.x += Math.cos(direction * Math.PI / 180) * 30;
                ball.y += Math.sin(direction * Math.PI / 180) * 30;

                ball.params.i++;
                if(ball.params.i > ball.params.distance) {
                    this.map.objects = this.map.objects.filter(x => x !== ball);
                }
            },
            onUserInteraction(player) {
                player.health -= 10;
            }
        });
    },
    removePlayer(socketId) {
        delete this.map.players[socketId];
        delete this.names[socketId];
    },
    canPlayerGoTo(player, x, y) {
        // Can't go off the map
        if(x < 0 || y < 0 || x > (this.map.width - 50) || y > (this.map.height - 50))
            return false;

        // Try to find a collision object
        const object = this.map.objects.find(obj => {
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
}