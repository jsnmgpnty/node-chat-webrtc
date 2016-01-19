messenger.factory("socketsService", ["$rootScope", "$timeout", "$interval",
function ($rootScope, $timeout, $interval) {
	var address = "http://192.168.15.206:3000/";
	var socket = {};
	if (io) {
    	socket = io.connect(address);
   	}
   	
    var broadcastMessage = function (topic, data) {
        var stop = $interval(function () {
            if ($rootScope.$$listeners[topic] && $rootScope.$$listeners[topic].length > 0) {
                $rootScope.$broadcast(topic, data);
                $interval.cancel(stop);
                stop = undefined;
            }
        }, 250);
    };

    var socketReady = $interval(function() {
        if (socket && socket.on) {
            $interval.cancel(socketReady);
            socketReady = undefined;

            socket.on("connect", function () {
                $rootScope.$broadcast("socketsConnected");
            });

            socket.on("echo", function (data) {
                console.log(data);
            });

            socket.on("SendChatMessage", function (data) {
                broadcastMessage("SendChatMessage", data);
            });
            
            socket.on("UserData", function (data) {
                broadcastMessage("UserData", data);
            });
            
            socket.on("UserChatOnline", function (data) {
                broadcastMessage("UserChatOnline", data);
            });
            
            socket.on("UserChatOffline", function (data) {
                broadcastMessage("UserChatOffline", data);
            });
            
            socket.on("SendFile", function (data) {
                broadcastMessage("SendFile", data);
            });
            
            socket.on("FileData", function (data) {
                broadcastMessage("FileData", data);
            });
            
            socket.on("VideoOffer", function (data) {
                broadcastMessage("VideoOffer", data);
            });
            
            socket.on("VideoDescription", function (data) {
                broadcastMessage("VideoDescription", data);
            });
            
            socket.on("VideoIceCandidate", function (data) {
                broadcastMessage("VideoIceCandidate", data);
            });
            
            socket.on("VideoDisconnected", function (data) {
                broadcastMessage("VideoIceCandidate", data);
            });
        }
    }, 250);
        
    return {
        emit: function (eventName, data, callback) {
        	var socketOpen = $interval(function () {
        		if (socket.connected) {
	                if (io) {
	                	$interval.cancel(socketOpen);
            			socketOpen = undefined;
            
	                    socket.emit(eventName, data, function () {
	                        var args = arguments;
	                        $rootScope.$apply(function () {
	                            if (callback) {
	                                callback.apply(socket, args);
	                            }
	                        });
	                        return true;
	                    });
	                }
	            }
	            return false;
        	}, 250);
        }
    };
}]);
