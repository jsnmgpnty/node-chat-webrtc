var express = require('express');
var app = express();
var router = express.Router();
var path = __dirname + '/views/';
var port = 3000;

var io = require('socket.io').listen(app.listen(port));
io.set("transports", [
   "polling"
   , "websocket"
   , "flashsocket"
   , "htmlfile"
   , "xhr-polling"
   , "jsonp-polling"
]);
var connectedUsers = []
    , channels = {
        userChat: "chat:"
    }
    , clientFunctions = {
    	userData: "UserData",
        userChatOnline: "UserChatOnline",
        userChatOffline: "UserChatOffline",
        sendChatMessage: "SendChatMessage",
        sendFile: "SendFile",
        fileData: "FileData",
        videoOffer: "VideoOffer",
        videoDescription: "VideoDescription",
        videoIceCandidate:"VideoIceCandidate",
        videoDisconnected: "VideoDisconnected"
    };

router.use(function (req,res,next) {
	console.log("/" + req.method);
	next();
});

router.get("/", function(req,res){
	res.sendFile(path + "index.html");
});

app.use('/', router);
app.use('/bower_components',  express.static(__dirname + '/bower_components'));
app.use('/js',  express.static(__dirname + '/public/javascripts'));
app.use('/css',  express.static(__dirname + '/public/stylesheets'));
app.use("*", function (req, res){
  	res.sendFile(path + "404.html");
});

io.sockets.on("connection", function (socket) {
	var isUserExisting = function (id) {
		var isExisting = false;
		
		for (var i = 0; i < connectedUsers.length; i++) {
			if (id === connectedUsers[i]) {
				isExisting = true;
				break;
			}
		}
		
		return isExisting;
	};
	
    socket.on("echo", function (data) {
        socket.emit("echo", data);
    });
        
    socket.on(clientFunctions.userChatOnline, function (data) {
    	var id = 0;
    	
    	if (data && data.userId) {
    		id = data.userId;
    	} else {
    		id = connectedUsers.length + 1;
    	}
    	
    	if (!isUserExisting(id)) {
        	connectedUsers.push(id);
    	}
        socket.join(channels.userChat + id);
        
        io.sockets.in(channels.userChat + id).send(">>> User " + id + " is online");
        io.sockets.emit(clientFunctions.userChatOnline, { userId: id });
        
        io.sockets.in(channels.userChat + id).emit(clientFunctions.userData, { userId: id, users: connectedUsers });
    });
    
    socket.on(clientFunctions.userData, function () {
        io.sockets.emit(clientFunctions.userData, { users: connectedUsers });
    });
    
    socket.on(clientFunctions.userChatOffline, function (data) {
        var index = connectedUsers.indexOf(data.id);
        connectedUsers.splice(index, 1);
        
        io.sockets.emit(clientFunctions.userChatOffline, { userId: data.id });
        io.sockets.in(channels.userChat + data.id).send(">>> User " + data.id + " is now offline");
        socket.leave(channels.userChat + data.id);
    });
    
    socket.on(clientFunctions.sendFile, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.sendFile, data);
    });
    
    socket.on(clientFunctions.sendChatMessage, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.sendChatMessage, data);
    });
    
    socket.on(clientFunctions.fileData, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.fileData, data);
    });
    
    socket.on(clientFunctions.videoOffer, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.videoOffer, data);
    });
    
    socket.on(clientFunctions.videoDescription, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.videoDescription, data);
    });
    
    socket.on(clientFunctions.videoIceCandidate, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.videoIceCandidate, data);
    });
    
    socket.on(clientFunctions.videoDisconnected, function (data) {
        io.sockets.in(channels.userChat + data.recipient).emit(clientFunctions.videoDisconnected, data);
    });
});


module.exports = app;
