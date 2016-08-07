/*
**	MODULES DEPENDENCY
*/

var path = require('path');
var desktop_app = require("app");
var webserver = require('./webserver');
var BrowserWindow = require("browser-window");
var config = require('./config.js');
var youtubeID = require('youtube-id');
var youtubeInfo = require('youtube-info');
var youtubeCrawler = require('youtube-crawler');
var win;
var playlist = [];
var player_status = false;

/*
**	CONFIGURATION
*/

desktop_app.on("ready", function() {
	win = new BrowserWindow({title:'playIT', autoHideMenuBar: true});
	if (config.env == "prod")
		win.setMenu(null);
	if (config.env == "dev")
		win.toggleDevTools();
	win.loadURL("file://" + __dirname + "/index.html");
});
webserver.port = 1337;
webserver.viewDir = path.join(__dirname, 'views');
webserver.publicDir = path.join(__dirname, 'public');
webserver.start();

/*
**	HTTP REQUEST
*/

webserver.me.get('/', function(req, res) {
	res.render('controller');
});

webserver.me.get('/youtube-search', function(req, res) {
	res.render('youtube');
});

/*
**	SOCKET COMMUNICATIONS
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
			// potential peerflix url //
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

	socket.on('youtube-search', function(query) {
		youtubeCrawler(query, function(err, result) {
			socket.emit('youtube-list', result);
		});
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

	socket.on('player-start', function(length, item, volume) {
		total_time = length;
		var time = player_time_toString(length);
		webserver.io.to('controller').emit('player-time', {total: time});
		webserver.io.to('controller').emit('player-playing', item);
		webserver.io.to('controller').emit('player-volume', volume);
	});

	socket.on('player-time-changed', function(times) {
		var current = player_time_toString(times.current);
		var total = player_time_toString(times.total);
		if (times.current > 0)
			var p_time = times.current * 100 / times.total;
		webserver.io.to('controller').emit('player-time', {current: current, total:total, p_time: p_time});
	});

	socket.on('player-stopped', function(b) {
		webserver.io.to('controller').emit('player-playing', {title:'aucune lecture en cours', img:'img/youtube-full.jpg'});
		webserver.io.to('controller').emit('player-time', {current: '', total:'', p_time:0});
	});

	socket.on('refresh-player-playing', function(data) {
		webserver.io.to('controller').emit('player-playing', data);		
	});

	socket.on('player-volume', function(value) {
		webserver.io.to('controller').emit('player-volume', value);
	});
}

webserver.io.on('connection', function(socket) {
	console.log('socket connected');
	socket.on('authentification', function(type) {
		console.log('authentification : ' + type);
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
