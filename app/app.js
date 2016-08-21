/*
**	MODULES DEPENDENCY
*/
var os = require('os');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var webserver = require('../lib/webserver');
var update = require('../lib/update');
var youtubeID = require('youtube-id');
var youtubeInfo = require('youtube-info');
var youtubeCrawler = require('../lib/youtube_crawler');
var is_admin = require('../lib/is_admin');

Object.defineProperty(Array.prototype, "removeItem", {
    enumerable: false,
    value: function (itemToRemove) {
        var filteredArray = this.filter(function(item){
            return item !== itemToRemove;
        });
        return filteredArray;
    }
});

//			init global variable		//
var version = fs.readFileSync(path.join(__dirname, '../version'), 'utf-8');
var win;
var playlist = [];
var player_status = false;
// 			configure webserver			//
webserver.port = 1337;
webserver.viewsDir = path.join(__dirname, 'views');
webserver.publicDir = path.join(__dirname, 'public');
webserver.start();
/*
**			HTTP REQUEST
*/
webserver.me.get('/', function(req, res) {
	res.render('controller');
});
webserver.me.get('/youtube-search', function(req, res) {
	res.render('youtube');
});
/*
**			SOCKETS
*/
function	controller(socket) {
	var play = false;

	for (var i in playlist) {
		if (playlist[i].playing)
			webserver.io.to('controller').emit('player-playing', playlist[i]);
	}

	if (!player_status) {
		webserver.io.to('controller').emit('player-playing', {title:'aucune lecture en cours', img:'img/youtube-full.jpg'});
		webserver.io.to('controller').emit('player-time', {current: '', total:'', p_time:0});
	} else {
		console.log('player status ', player_status);
		webserver.io.to('player').emit('on-item', true);
	}
	socket.emit('playlist', playlist);
	webserver.io.to('player').emit('controller', true);
	socket.on('play-url', function(url) {
		var id = 0;

		if (!playlist[0])
			play = true;
		else
			play = false;
		id = youtubeID(url);
		if (id) {
			// is youtube url //
			console.log(id);
			youtubeInfo(id, function(err, info) {
				console.log(info.title);
				console.log(info.thumbnailUrl);
				console.log('play url insertion ', play);
				var item = {title: info.title, url:url, img:info.thumbnailUrl, type:'youtube'}
				playlist.push(item);
				webserver.io.to('controller').emit('playlist', playlist);
				if (play) {
					webserver.io.to('player').emit('play-item', item, playlist.indexOf(item));
					player_status = true;
					return;
				}
				webserver.io.to('player').emit('add-item', item, playlist.indexOf(item));
			});
		} else {
			// TODO other url like peerflix or soundcloud //
		}
	});
	socket.on('playlist-pause', function(b) {
		webserver.io.to('player').emit('playlist-pause', true);
	});
	socket.on('playlist-stop', function(b) {
		webserver.io.to('player').emit('playlist-stop', true);
	});
	socket.on('playlist-next', function(b) {
		webserver.io.to('player').emit('playlist-next', true);
	});
	socket.on('playlist-back', function(b) {
		webserver.io.to('player').emit('playlist-back', true);
	});
	socket.on('playlist-play', function(b) {
		webserver.io.to('player').emit('playlist-play', true);
	});
	socket.on('volume-up', function(b) {
		webserver.io.to('player').emit('volume-up', true);
	});
	socket.on('volume-down', function(b) {
		webserver.io.to('player').emit('volume-down', true);
	});

	socket.on('playlist-delete', function(id) {
		playlist = playlist.removeItem(playlist[id]);
		webserver.io.to('player').emit('playlist-delete', id);
		webserver.io.to('controller').emit('playlist', playlist);
	});

	socket.on('youtube-search', function(query) {
		youtubeCrawler(query, function(result) {
			if (result)
				socket.emit('youtube-list', result);
		});
	});

	socket.on('player:goto', function(p) {
		webserver.io.to('player').emit('player:goto', p);
	});
}

function	player(socket) {

	function	player_time_toString(m) {
		var sec = Math.floor(m / 1000) % 60;
		var mn = Math.floor(m / (1000*60)) % 60;
		var h = Math.floor(m / (1000*60*60)) % 60;
		var time = "";
		if (h > 0)
			time += "" + h + " h ";
		time += "" + mn + " mn " + sec + " sec";
		return time;
	}

	webserver.io.to('player').emit('current-version', version);
	if (typeof webserver.io.sockets.adapter.rooms['controller'] == 'undefined')
		socket.emit('no-controller');

	socket.on('player-start', function(length, item, volume) {
		total_time = length;
		var time = player_time_toString(length);
		webserver.io.to('controller').emit('player-time', {total: time});
		webserver.io.to('controller').emit('player-playing', item);
		webserver.io.to('controller').emit('player-volume', volume);
		player_status = true;
	});

	socket.on('player-time-changed', function(times) {
		var current = player_time_toString(times.current);
		var total = player_time_toString(times.total);
		if (times.current > 0)
			var p_time = times.current * 100 / times.total;
		webserver.io.to('controller').emit('player-time', {current: current, total:total, p_time: p_time ? p_time.toFixed(0) : 0});
	});

	socket.on('player-stopped', function(b) {
		webserver.io.to('controller').emit('player-playing', {title:'aucune lecture en cours', img:'img/youtube-full.jpg'});
		webserver.io.to('controller').emit('player-time', {current: '', total:'', p_time:0});
		player_status = false;
	});

	socket.on('refresh-player-playing', function(data) {
		webserver.io.to('controller').emit('player-playing', data);		
	});

	socket.on('player-volume', function(value) {
		webserver.io.to('controller').emit('player-volume', value);
	});

	socket.on('spinner', function(b) {
		// on media openning //
		webserver.io.to('controller').emit('player-playing', {title:'ouverture du media en cours..', img:'img/youtube-full.jpg'});
		webserver.io.to('controller').emit('player-time', {current: '', total:'', p_time:0});
	});
}

webserver.io.on('connection', function(socket) {
	socket.on('authentification', function(type) {
		this.type = type;
		if (type == 'controller') {
			socket.join(type);
			controller(socket);
		}
		if (type == 'player') {
			socket.join(type);
			player(socket);
		}
	});
});

/*
**	NAMESPACE FOR UPDATING
*/

function	updater(socket) {
	socket.emit('version:current', version);
	update.is_updatable(function(lastest_version) {
		if (lastest_version != false && lastest_version != version) {
			socket.emit('version:lastest', lastest_version);
			is_admin(function(b) {
				socket.emit('is:admin', b);
				if (!b) return;
				socket.on('update', function(b) {
					update.update(this, function() {
						fse.removeSync(path.join(__dirname, '../tmp.zip'));
						socket.emit('update:done', true);
					});
				});
			});
		}
	});
}

var nsp_update = webserver.io.of('/update');
nsp_update.on('connection', function(socket) {
	socket.on('authentification', function(type) {
		if (type == 'updater') {
			console.log('login updater');
			updater(this);
		}
	});

});