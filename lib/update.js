var fs = require('fs');
var request = require('request');
var path = require('path');
var os = require('os');
var decompress = require('decompress-zip');

var platform = os.platform();
var domain_name = 'http://localhost:1887';
var version_url = '/version/playit/';
var update_url = '/update/playit/';
var current_version = 'alpha_0.0.1';

function	unzip(file_path, socket, callback) {
	var unzipper = new decompress(file_path);

	unzipper.on('error', function(err) {
		callback(err);
	});
	unzipper.on('extract', function(log) {
		callback(null);
	});
	unzipper.on('progress', function(index, total) {
		socket.emit('update:progress', ((index * 100) / total).toFixed(0));
	});
	unzipper.extract({
		path: path.join(__dirname, '..')
	});
}

module.exports.is_updatable = function(callback) {
	request(domain_name + version_url + platform, function(error, response, lastest_version) {
		if (!error && response.statusCode == 200)
			if (current_version != lastest_version)
				return callback(lastest_version);
		return callback(false);
	});
}

module.exports.update = function(socket, callback) {
	var update = fs.createWriteStream(path.join(__dirname, '../tmp.zip'));
	var req = request(domain_name + update_url + platform);
	req.pipe(update);
	var file_length = 0;
	var copied = 0;
	req.on('response', function(data) {
		file_length = data.headers['content-length'];
	});
	req.on('data', function(chunk) {
		copied += chunk.length;
		var pourcent = (copied * 100) / file_length;
		if (pourcent.toFixed(0) < 100)
			socket.emit('update:download', pourcent.toFixed(0));
	});
	req.on('end', function() {
		socket.emit('update:download', 100);
		unzip(path.join(__dirname, '../tmp.zip'), socket, function(error) {
			if (!error) {
				console.log('end');
				return callback();
			}
			console.log(error);
		});
	});
	req.on('error', function(err) {
		socket.emit('update-error', 'une erreur est survenue relancer l\'application');
	});
}