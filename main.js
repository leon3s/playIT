/*
**	MODULES DEPENDENCY
*/
var os = require('os');
var fs = require('fs');
var path = require('path');
var desktop_app = require("app");
var BrowserWindow = require('browser-window');
var fork = require('child_process').fork;
var update = require('./lib/update');
var version = fs.readFileSync(path.join(__dirname, './version'), 'utf-8');

if (os.platform() == 'win32')
	process.env['VLC_PLUGIN_PATH'] = path.join(__dirname, 'node_modules/webchimera.js/plugins');
// start everything //
var app = fork(path.join(__dirname, './app/app.js'));
desktop_app.on("ready", function() {
	win = new BrowserWindow({title:'PLAYIT', autoHideMenuBar: true, icon:path.join(__dirname, './icon.ico')});
	//for win.setMenu(null);
	// test if update is avaible for swap views (noob fix for dll open) //
	update.is_updatable(function(lastest_version) {
		console.log(version, lastest_version);
		if (lastest_version != false && version != lastest_version)
			return win.loadURL(`file://${__dirname}/app/views/update.html`);
		return win.loadURL(`file://${__dirname}/app/views/index.html`);
	});
});
desktop_app.on('window-all-closed', function() {
	desktop_app.quit();
	app.kill('SIGINT');
});