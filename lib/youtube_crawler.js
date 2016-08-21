/*
**	SIMPLE YOUTUBE CRAWLER
*/
var request = require('request');
var cheerio = require('cheerio');

function youtube(query, callback) {
	var url = 'https://www.youtube.com/results?search_query=';
	var data = [];

	if (!query)
		callback(false);

	url += query;
	request(url, function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(body);
			var list = $(".yt-uix-tile-link");
			list.each(function(i) {
				var url = $(this).attr('href');
				if (url.split('/')[1] == 'channel')
					return;
				var title = $(this).text();
				var vid_url = 'https://www.youtube.com' + url
				var id = url.split('=')[1];
				var img = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
				data.push({
					title: title,
					url: vid_url,
					img:img
				});
				if (i == list.length - 1)
					callback(data);
			});
		}
	});
}

module.exports = youtube;