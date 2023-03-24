export default () => [
    {
        color: 'red',
        x: 10,
        y: 10,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 5000) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        onUserInteraction: (player) => {
            player.health -= 1;
        }
    },
    {
        color: 'green',
        x: 200,
        y: 10,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 5000) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        deleteAfterUse: true,
        onUserInteraction: (player) => {
            player.health = Math.min(100, player.health + 20);
        }
    },
    {
        color: 'gold', // yellow
        x: 1050,
        y: 650,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 500) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        deleteAfterUse: false,
        onUserInteraction: (player) => {
            player.health = Math.min(100, player.health + 5);
        }
    },
    {
        color: 'blue',
        x: 1100,
        y: 400,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 5000) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        deleteAfterUse: true,
        onUserInteraction: (player) => {
            player.distance = Math.min(7, player.distance + 1);
        }
    },
    {
        color: 'indigo',
        x: 1100,
        y: 400,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 5000) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        deleteAfterUse: true,
        onUserInteraction: (player) => {
            player.balls.regular += 10;
        }
    },
    {
        color: 'indigo',
        x: 1100,
        y: 400,
        width: 20,
        height: 20,
        params: {
            i: 0,
        },
        callback: (item, map) => {
            item.params.i++;
            if(item.params.i > 5000) {
                map.objects = map.objects.filter(x => x !== item);
            }
        },
        deleteAfterUse: true,
        onUserInteraction: (player) => {
            player.balls.regular += 10;
        }
    },
];