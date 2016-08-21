var path = require('path');
window.$ = window.jQuery = require(path.join(__dirname, '../public/js/plugins/jquery/jquery.min.js'));
const remote = require('electron').remote;
var socket = io.connect('http://localhost:1337/update');

socket.on('connect', function() {
	socket.emit('authentification', 'updater');
});

socket.on('version:current', function(version_id) {
	console.log(version_id);
  $("#version_current").text(version_id);
});

socket.on('version:lastest', function(version_id) {
	$("#version_lastest").text(version_id);
});

$("#update").click(function(e) {
	$(this).hide();
	$("#update_progress").show();
	e.preventDefault();
	socket.emit('update', true);
});

socket.on('update:download', function(p) {
	$("#update_text").text('Telechargement..');
	$("#update_progress").val(p);
});

socket.on('update:progress', function(p) {
	$("#update_text").text('Application du patch..');
	$("#update_progress").val(p);
});

socket.on('update:done', function(b) {
	$("#update_text").text('Mise a jour terminer, redemarrer l\'application');
	$("#update").text('redemarrer');
	$("#update").show();
	$("#update_progress").hide();
	$("#update").click(function(e) {
		e.preventDefault();
		remote.getCurrentWindow().close();
	});
});