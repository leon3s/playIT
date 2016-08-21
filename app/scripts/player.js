var path = require('path');
window.$ = window.jQuery = require(path.join(__dirname, '../public/js/plugins/jquery/jquery.min.js'));
var canvas = document.getElementById("canvas");
var renderContext = require("webgl-video-renderer").setupCanvas(canvas);
var player = require("webchimera.js").createPlayer();
var socket = io.connect('http://localhost:1337');
var volume = 50;
var update = 0;

require('dns').lookup(require('os').hostname(), function (err, addr, fam) {
  $("#ip").text(addr);
});

var loading_screen = pleaseWait({
  logo: "../public/img/leone_logo.png",
  backgroundColor: 'white',
  loadingHtml: '<h1 style="text-transform: uppercase;margin-top:-50px"><strong>leone developpement</strong></h1><div class="spinner" style="margin-top:-10px"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
});

player.playlist.mode = 2;

player.onFrameReady = function(frame) {
  renderContext.render(frame, frame.width, frame.height, frame.uOffset, frame.vOffset);
}

socket.on('connect', function(){
  console.log('im connected to socket system');
  socket.emit('authentification', 'player');
});

player.onOpening = function() {
  $(".overlay").fadeIn();
  if ($("#overlay-text").text() != 'chargement du media') {
    $("#overlay-text").hide();
    $("#waiting").fadeIn();
    $("#overlay-text").text('chargement du media');
    $("#overlay-text").fadeIn();
  }
  socket.emit('spinner', true);
}

socket.on('state', function(b) {
  socket.emit('state', {
    state: player.state,
    playing: player.playing,
    position: player.position,
    time:player.time,
    volume:player.volume,
    mute:player.mute
  });
});

player.onPlaying = function() {
  player.volume = volume;
  if (player.playlist.items[player.playlist.currentItem].artist != '') {
    $(".overlay").fadeOut(3000);
    socket.emit('player-start', player.length, {
        title: player.playlist.items[player.playlist.currentItem].title,
        img:player.playlist.items[player.playlist.currentItem].artworkURL
      }, volume);
  }
}

player.onTimeChanged = function(time) {
  socket.emit('player-time-changed', {current: time, total: player.length});
}

player.onStopped = function() {
  $("#overlay-text").text('aucun flux en cours de lecture');
  $(".overlay").fadeIn();
  $("#waiting").fadeOut();
  socket.emit('player-stopped', true);
}

socket.on('on-item', function(b) {
  // ask the current item playing when a controller reconnect //
  console.log(player.state);
  if (player.playlist.items[player.playlist.currentItem].artist != '') {
    var title = player.playlist.items[player.playlist.currentItem].title;
    var img = player.playlist.items[player.playlist.currentItem].artworkURL;
    socket.emit('refresh-player-playing', {title:title, img:img});
    socket.emit('player-time-changed', {current: player.time, total: player.length});
    socket.emit('player-volume', volume);
  }
});

socket.on('playlist-next', function(b) {
  player.playlist.next();
});

socket.on('playlist-back', function(b) {
  player.playlist.prev();
});

socket.on('playlist-pause', function(b) {
  player.playlist.togglePause();
});

socket.on('playlist-play', function(b) {
  player.playlist.play();
});

socket.on('playlist-stop', function(b) {
  player.playlist.stop();
});

socket.on('volume-up', function(b) {
  volume += 10;
  if (volume > 100)
    volume -= 10;
  player.volume = volume;
  socket.emit('player-volume', volume);
});

socket.on('volume-down', function(b) {
  volume -= 10;
  if (volume < 0)
    volume += 10;
  player.volume = volume;
  socket.emit('player-volume', volume);
});

socket.on('play-item', function(item, index) {
  console.log('play-item', item.url);
  var id = player.playlist.add(item.url);
  console.log(id);
  player.playlist.playItem(id);
});

socket.on('add-item', function(item, index) {
  var id = player.playlist.add(item.url);
});

socket.on('playlist-delete', function(id) {
  if (id == player.playlist.currentItem) {
    player.playlist.next();
  }
  player.playlist.removeItem(id);
  if (!player.playlist.itemCount) {
    player.playlist.stop();
  }
});

socket.on('no-controller', function(b) {
  $("#controller").show();
});

socket.on('controller', function(b) {
  $("#controller").hide();
});

socket.on('current-version', function(version_id) {
  $("#current_version").text(version_id);
  loading_screen.finish();
});

socket.on('player:goto', function(p) {
  var len = player.length;
  var t = Math.floor(p * len / 100);
  console.log(t);
  player.time = t;
});