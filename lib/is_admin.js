var os = require('os');
var exec = require('child_process').exec;

module.exports = function(callback) {
	if (os.platform() == 'win32') {
		exec('NET SESSION', function(err, stdout, stderr) {
			callback(stderr.length === 0 ? true : false);
		});
	} else {
		exec('whoami', function(err, stdout, stderr) {
			callback(stdout === 'root' ? true : false);
		});
	}
}