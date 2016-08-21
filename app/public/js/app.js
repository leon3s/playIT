var app = angular.module('netesport', ['ngRoute']);
var socket = io.connect();

var auth0;

// LOGIN //
function start(auth) {
	auth0 = auth;
	socket.emit('login:user', auth0);
}


// CONFIGURE ROUTES //
app.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/', {
    	templateUrl: '/timeline',
    	controller: 'timelineCtrl'
    })
	.when('/wow/chat', {
		templateUrl: '/wow/chat',
		controller: 'chatCtrl'
	})
	.when('/inbox', {
		templateUrl: '/inbox',
		controller: 'inboxCtrl'
	})
	.when('/inbox/:username', {
		templateUrl: function(params) {
			return '/inbox/' + params.username;
		},
		controller:'inboxCtrl2'
	})
	.when('/wow/pvp/:bracket', {
		templateUrl: function(params) {
			return '/wow/pvp/' + params.bracket;
		},
		controller:'wowFinderCtrl'
	})
	.when('/:username', {
		templateUrl: function(params) {
			return '/user/' + params.username;
		},
		controller: 'myprofileCtrl'
	})
	.when('/:username/wow', {
		templateUrl: function(params) {
			return '/user/' + params.username + '/wow';
		},
		controller: 'profileWoWCtrl'
	})
	.when('/:username/settings', {
		templateUrl: function(params) {
			return '/user/' + params.username + '/settings';
		},
		controller:'userSettingsCtrl'
	});
//    $locationProvider.html5Mode(true);
}])

app.controller('centerViewCtrl', ['$route', '$routeParams', '$location',
  function($route, $routeParams, $location) {
    this.$route = $route;
    this.$location = $location;
    this.$routeParams = $routeParams;
}]);
// END CONFIGURE ROUTES //

// PROFILE WOW //

app.controller('profileWoWCtrl', function($scope) {
	$(".pvp-data").hide();
	$(".show-pvp").hover(function() {
		$(this).css({
			"background-color": "#29b2e1",
			"border-color": "#29b2e1"
		});
	}, function(){
		var index = $(this).attr('data-index');
		if ($("#pvp-data-" + index).is(':visible')) {
			$(this).css({
				"background-color": "#29b2e1",
				"border-color": "#29b2e1"
			});
		} else {
			$(this).css({
				"background-color": "#1caf9a",
				"border-color": "#1caf9a"
			});
		}
	});
	$(".show-pvp").click(function(){
		var index = $(this).attr('data-index');
		if ($("#pvp-data-" + index).is(':visible')) {
			$("#pvp-data-" + index).hide();
			$(this).css({
				"background-color": "#1caf9a",
				"border-color": "#1caf9a"
			});
		} else {
			$("#pvp-data-" + index).show();
			$(this).css({
				"background-color": "#29b2e1",
				"border-color": "#29b2e1"
			});
		}
	});
});

// END PROFILE WOW //

// PROFILE SETTINGS //
app.controller('userSettingsCtrl', function($scope, $location) {

	var oauth_bnet_window = 0;

	$scope.update_description = function() {
		var title = $("#description-title").val();
		var text = $("#description-text").val();
		socket.emit('settings:description', {
			title:title,
			text:text
		});
	}

	$scope.update_bnet = function() {
		swal({
			title: "authentification",
			text: "demande d'acces a vos information world of warcraft" + '<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>',
			html: true,
			showConfirmButton: false,
			type: "info"
		});
		oauth_bnet_window = window.open("https://netesport.leone-dev.com/auth/bnet/eu/wow/", "", "width=500, height=500");   // Opens a new window
	}

	socket.on('settings:close:oauth:bnet', function(data) {
		oauth_bnet_window.close();
		oauth_bnet_window.close();
		oauth_bnet_window.close();
		oauth_bnet_window.close();
	});

	socket.on('settings:wow:oauth', function(p) {
		oauth_bnet_window.close();
		swal({
			title: p.title,
			text: p.text + '<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>',
			type: p.type,
			html: true,
			showConfirmButton: false
		});
	});

	socket.on('settings:wow:oauth:success', function(p) {
		oauth_bnet_window.close();
		swal({
			title: p.title,
			text: p.text,
			type: p.type
		}, function(){
			window.location.reload();
		});
	});

	socket.on('settings:description:title:error', function(text) {
		$("#description-title-error").text(text);
		$("#description-title-error").css({"color" : "red"});
	});


	socket.on('settings:description:text:error', function(text) {
		$("#description-text-error").text(text);
		$("#description-text-error").css({"color" : "red"});
	});

	socket.on('settings:description:success', function(text) {
		swal({
			title: "Success",
			text: text,
			type: "success",
		});
	});
});

// END PROFILE SETTINGS //

// INBOX //
app.controller('inboxCtrl', function($scope){
	socket.emit('wow_room:exit:chat', true);
	socket.emit('inbox:convs', true);

	$scope.convs = [];

	socket.on('inbox:convs', function(data) {
		$scope.$apply(function() {
			$scope.convs.push(data);
		});
	});

	socket.on('inbox:convs:clear', function(data){
		$scope.convs = [];
	});

	socket.on('inbox:recv', function(data) {
		var convs = $scope.convs;

		for (var i in convs) {
			if (convs[i].mate == data.from) {
				convs[i].new += 1;
				$scope.$apply(function() {
					$scope.convs = convs;
				});
			}
		}
	});

	socket.on('inbox:user_status', function(data){
		var convs = $scope.convs;

		for (var i in convs) {
			if (convs[i].mate == data.user) {
				convs[i].online = data.online;
				$scope.$apply(function() {
					$scope.convs = convs;
				});
			}
		}
	});

});

app.controller('inboxCtrl2', function($scope, $routeParams) {
	socket.emit('wow_room:exit:chat', true);
	socket.emit('inbox:readed', $routeParams.username);
	socket.emit('inbox:convs', true);
	$scope.messages = [];
	$scope.convs = [];

	var to = $routeParams.username;

	var myDiv = document.getElementById("messageBox");
	myDiv.scrollTop = myDiv.scrollHeight;

	var sendMessage = function() {
		if ($scope.message.length > 0) {
			socket.emit('inbox:send', {from:auth0, to:to, message:$scope.message});
			$scope.message = '';
			socket.emit('inbox:convs', true);
		}
	}

	$scope.enterSend = sendMessage;
	$scope.send = sendMessage;

	socket.on('inbox:convs', function(data) {
		$scope.$apply(function() {
			$scope.convs.push(data);
		});
	});

	socket.on('inbox:convs:new', function(data) {
		var convs = $scope.convs;
		for (var i in convs) {
			if (convs[i].mate = data.mate) {
				convs[i].new = data.new;
			}
		}
		$scope.$apply(function() {
			$scope.convs = convs;
		});
	});

	socket.on('inbox:user_status', function(data){
		var convs = $scope.convs;

		for (var i in convs) {
			if (convs[i].mate == data.user) {
				convs[i].online = data.online;
				$scope.$apply(function() {
					$scope.convs = convs;
				});
			}
		}
	});

	socket.on('inbox:convs:clear', function(data){
		$scope.convs = [];
	});

	socket.on('inbox:recv', function(data) {
		if (data.from == to || data.to == to) {
			socket.emit('inbox:readed', $routeParams.username);
			$scope.$apply(function() {
				var date = new Date(data.date);
	            var d = '';
                var tmp = {};
                tmp = data;
                d += date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
                d += ' ' + date.getHours() + 'H' + date.getMinutes() + 'mn';
                tmp.dateString = d;
				$scope.messages.push(tmp);
			});
			var myDiv = document.getElementById("messageBox");
			myDiv.scrollTop = myDiv.scrollHeight;
		} else {
			var convs = $scope.convs;
			for (var i in convs) {
				if (convs[i].mate == data.from) {
					convs[i].new += 1;
					$scope.$apply(function() {
						$scope.convs = convs;
						socket.emit('inbox:add:unread_message', true);
					});
				}
			}
			
		}
	});
});
// END INBOX //

// WOW MATE FINDER //
app.controller('wowFinderCtrl', function($scope) {
	$('#customers2').DataTable();
	socket.emit('wow_room:exit:chat', true);
});
// END WOW MATE FINDER //

// PROFILE //
app.controller('myprofileCtrl', function($scope){
	socket.emit('wow_room:exit:chat', true);
});

app.controller('wowStatsCtrl', function($scope, $http, $routeParams) {

	$scope.wowStats = [];

	console.log($routeParams.username);

	$scope.show = function(index) {
		var table = $("#show-" + index);
		$(".table").hide();
		table.show();
		$('html,body').animate({scrollTop: table.offset().top - 500});
	}

	$http({
		method: 'GET',
		url: '/api/wow/' + $routeParams.username
	}).success(function(data, status) {
		$scope.wowStats = data;
	}).error(function(err) {
	});
});

$(".WoWcharacters").on("click", function() {
	alert('gg');
});

app.controller('getStatsCtrl', function($scope){

	$scope.getStats = function() {
		swal({
			title: "Veuillez patienter",
			text: "Recuperation de vos statistiques...",
			type: "info",
			showConfirmButton: false
		});
	}

	socket.on('stats:end', function(data) {
		location.reload();
		console.log(data);
		swal.close();
	});
});

app.controller('updateStatsCtrl', function($scope){

	$scope.updateStats = function() {
		swal({
			title: "Veuillez patienter",
			text: "Mise a jour de vos statistiques...",
			type: "info",
			showConfirmButton: false
		});
	}

	socket.on('stats:end', function(data) {
		location.reload();
		console.log(data);
		swal.close();
	});
});
// END PROFILE //

// CHAT //
app.controller('chatCtrl', function($scope){
	socket.emit('wow_room:join:chat', true);
});

app.controller('chatIoCtrl', function($scope) {
	$scope.messages = [];
	socket.on('wow_room:message:recv', function(data) {
		console.log(data);
		$scope.$apply(function() {
			console.log('message:recv', data);
			$scope.messages.push(data);
		});
		var myDiv = document.getElementById("messageBox");
		myDiv.scrollTop = myDiv.scrollHeight;
	});
	socket.on('wow_room:message:private', function(data) {
		$scope.$apply(function() {
			console.log(data.from);
			console.log(auth0);
			if (data.type != 2) {
				if (Notification.permission === "granted") {
					var notification = new Notification(data.from + " vous chuchote : " + data.data);
				}
			}
			$scope.messages.push(data);
		});
		var myDiv = document.getElementById("messageBox");
		myDiv.scrollTop = myDiv.scrollHeight;
	});
	socket.on('wow_room:message:error', function(data){
		$scope.$apply(function() {
			$scope.messages.push(data);
		});
		var myDiv = document.getElementById("messageBox");
		myDiv.scrollTop = myDiv.scrollHeight;
	});

	$(".content-frame-right-toggle").on("click",function(){
		$(".content-frame-right").is(":visible")
		? $(".content-frame-right").hide() 
		: $(".content-frame-right").show();
		page_content_onresize();
    });  
});

app.controller('sendCtrl', function($scope) {

	$scope.message;

	$scope.send = function(){
		if ($scope.message.length > 0)
			socket.emit('wow_room:message:send', $scope.message);
			$scope.message = '';
	}

	$scope.enterSend = function() {
		if ($scope.message.length > 0)
			socket.emit('wow_room:message:send', $scope.message);
		$scope.message = '';
	}
});

app.controller('userOnlineCtrl', function($scope){
	$scope.users = [];

	$scope.viewProfile = function(profileName) {
		$("#profile-overlay").show();
		$("#profile-iframe").attr('src', 'https://netesport.leone-dev.com/#/' + profileName);
	}

	socket.on('user:connected', function(data) {
		$scope.$apply(function() {
			$scope.users = data;
		});
	});
	socket.on('user:disconnected', function(data) {
		$scope.$apply(function() {
			var index = $scope.users.indexOf(data.name);
			$scope.users.splice(index, 1);  	
		});
	});
});
// END CHAT //

// INBOX NOTIFICATIONS //
app.controller('notificationMessageCtrl', function($scope, $routeParams, $location) {
	$scope.newNu = 0;

	socket.emit('inbox:ask:unread_message', true);

	socket.on('inbox:unread_message', function(nu) {
		$scope.$apply(function() {
			$scope.newNu = nu;
		});
	});

	socket.on('inbox:notification', function(data) {
		var p = $location.path();
		var a = p.split('/');
		console.log(a);
		if (a[1] != 'inbox') {
			$scope.$apply(function() {
				$scope.newNu += 1;
			});
		}
	});
});
// END INBOX NOTIFICATIONS //


// DISCONNECTED //
socket.on('disconnect', function(){
	swal({
		title: "Error",
		text: "Vous avez ete deconnecter",
		type: "info",
		showCancelButton: false
	}, function(){
		location.reload();
	});
});
// END DISCONNECTED

// ASK SYSTEM NOTIFICATION PERMISSION //
if (Notification.permission !== 'denied') {
	Notification.requestPermission(function (permission) {
		if(!('permission' in Notification))
			Notification.permission = permission;
    });
}

// DISABLE CACHE //
app.run(function($rootScope, $templateCache) {
   $rootScope.$on('$viewContentLoaded', function() {
      $templateCache.removeAll();
   });
});
