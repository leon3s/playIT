/*
**	Modules dependencies
*/
var http			=	require('http');
var https			=	require('https');
var hsts			=	require('hsts');
var path			=	require('path');
var express			=	require('express');
var io				=	require('socket.io');
var morgan			=	require('morgan');

/*
**		class webserver
**	  init http and socket.io server
*/
function	webserver() {
	this.me = express();
	this.io;
	this.viewsDir = path.join(__dirname, 'views');
	this.publicDir = path.join(__dirname, 'public');
	this.bowerJsDir = 0;
	this.port = 0;

	var app = this;

	this.start = function(ssl) {
		app.me = express();
		if (typeof ssl == 'undefined')
			var server = http.createServer(app.me);
		else
			var server = https.createServer(ssl, app.me);
		app.io = io.listen(server);
		app.me.disable('x-powered-by');
		app.me.set('port', app.port);
		app.me.set('views', app.viewsDir);
		app.me.set('view engine', 'ejs');
		app.me.set('trust proxy', 1)
		app.me.use(hsts({
			maxAge: 7776000000
		}));
		app.me.use(express.static(this.publicDir));
		app.me.use(morgan('dev'));
		server.listen(app.port, function() {
			console.log('webserver started on http://localhost:' + app.port);
		});
	}
}

module.exports = new webserver();
