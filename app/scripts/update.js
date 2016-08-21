var path = require('path');
window.$ = window.jQuery = require(path.join(__dirname, '../public/js/plugins/jquery/jquery.min.js'));
const remote = require('electron').remote;
var socket = io.connect('http://localhost:1337/update');

var loading_screen = pleaseWait({
  logo: "../public/img/leone_logo.png",
  backgroundColor: 'white',
  loadingHtml: '<h1 style="text-transform: uppercase;margin-top:-50px"><strong>leone developpement</strong></h1><div class="spinner" style="margin-top:-10px"><div class="double-bounce1"></div><div class="double-bounce2"></div></div>'
});

socket.on('connect', function() {
	socket.emit('authentification', 'updater');
});

socket.on('version:current', function(version_id) {
	console.log(version_id);
  $("#version_current").text(version_id);
});

socket.on('version:lastest', function(version_id) {
	$("#version_lastest").text(version_id);
	loading_screen.finish();
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
	$("#update_text").text('Mise a jour terminer, redemarrer l\'application normalement.');
	$("#update").text('redemarrer');
	$("#update").show();
	$("#update_progress").hide();
	$("#update").click(function(e) {
		e.preventDefault();
		remote.getCurrentWindow().close();
	});
});

socket.on('is:admin', function(b) {
	if (!b) {
		$("#admin").show();
		$("#update").text("quitter");
		$("#update").click(function(e) {
			e.preventDefault();
			remote.getCurrentWindow().close();
		});
	} else {
		$("#update").click(function(e) {
			$(this).hide();
			$("#update_progress").show();
			e.preventDefault();
			socket.emit('update', true);
		});
	}
});