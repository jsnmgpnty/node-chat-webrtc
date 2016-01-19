messenger.controller("messengerController", ["$scope", "$rootScope", "$interval", "socketsService", "localStorageService", function ($scope, $rootScope, $interval, socketsService, localStorageService) {
	$scope.user = {
		id: ""
	};
	
	$scope.isSignedIn = false;
	
	$scope.isMessagesOpen = false;
	
	$scope.chatMateId = "";
	
	$scope.newMessage = "";
	
	$scope.messages = [];
	
	$scope.users = [];
	
	$scope.alertMessage = "";
	
	$scope.alertStyle = "";
	
	$scope.activeChatWindow = null;
	
	$scope.addUser = function (id) {
		var isExist = false;
		
		for (var i = 0; i < $scope.users.length; i++) {
			if (id === $scope.users[i]) {
				isExist = true;
			}
		}
		
		if (!isExist) {
			$scope.users.push(id);
		}
	};
	
	$rootScope.$on("VideoOffer", function(ev, data) {
		if (!data) return;
		if (data.sender === $scope.user.id) return;
		
		var hasChatWindow = false;
    	
    	for (var i = 0; i < $scope.messages.length; i++) {
    		if (data.sender === $scope.messages[i].chatMateId) {
    			hasChatWindow = true;
    			$scope.activeChatWindow = $scope.messages[i];
    		} else {
    			$scope.messages[i].isOpen = false;
    		}
    	}
    	
    	if (!hasChatWindow) {
    		var chatWindow = {
    			chatMateId: data.sender,
    			messages: []
    		};
    		
    		$scope.messages.push(chatWindow);
    		$scope.activeChatWindow = chatWindow;
    	}
    	
    	var chatLauncherInterval = $interval(function () {
            if ($rootScope.$$listeners["LaunchVideoChat"] && $rootScope.$$listeners["LaunchVideoChat"].length > 0) {
                $interval.cancel(chatLauncherInterval);
                chatLauncherInterval = undefined;
				$rootScope.$broadcast("LaunchVideoChat", data);
            }
        }, 250);
	});
	    
	$rootScope.$on("SendChatMessage", function (ev, data) {
		var hasChatWindow = false;
		
		for (var i = 0; i < $scope.messages.length; i++) {
			if (data.sender === $scope.messages[i].chatMateId) {
				$scope.messages[i].messages.push(data);
				hasChatWindow = true;
			}
		}
		
		if (!hasChatWindow) {
			var chatWindow = {
    			chatMateId: data.sender,
    			messages: [],
    			isOpen: false
    		};
    		chatWindow.messages.push(data);
    		$scope.messages.push(chatWindow);
    		
    		for (var i = 0; i < $scope.messages.length; i++) {
	    		if (data.sender === $scope.messages[i].chatMateId) {
	    			$scope.activeChatWindow = $scope.messages[i];
	    		} else {
	    			$scope.messages[i].isOpen = false;
	    		}
	    	}
		}
	});
	
	$rootScope.$on("UserChatOnline", function (ev, data) {
    	$scope.addUser(data.userId);
        $scope.alertMessage = "User " + data.userId + " is online";
        $scope.alertStyle = "alert-success";
    });
    
    $rootScope.$on("UserChatOffline", function (ev, data) {
    	var index = $scope.users.indexOf(data.userId);
    	$scope.users.splice(index, 1);
    	
        $scope.alertMessage = "User " + data.userId + " is offline";
        $scope.alertStyle = "alert-danger";
    });
    
    $rootScope.$on("UserData", function (ev, data) {
        if (data) {
        	for (var i = 0; i < data.users.length; i++) {
        		$scope.addUser(data.users[i]);
        	}
        }
    });
    
    $scope.getNumberOfMessages = function (user) {
    	for (var i = 0; i < $scope.messages.length; i++) {
    		if (user === $scope.messages[i].chatMateId) {
    			return $scope.messages[i].messages.length;
    		}
    	}
    	
    	return 0;
    };
        
    $scope.openChat = function (chatUserId) {
    	if (chatUserId === $scope.user.id) {
    		return;
    	}
    	
    	var hasChatWindow = false;
    	
    	for (var i = 0; i < $scope.messages.length; i++) {
    		if (chatUserId === $scope.messages[i].chatMateId) {
    			hasChatWindow = true;
    			$scope.activeChatWindow = $scope.messages[i];
    		} else {
    			$scope.messages[i].isOpen = false;
    		}
    	}
    	
    	if (!hasChatWindow) {
    		var chatWindow = {
    			chatMateId: chatUserId,
    			messages: []
    		};
    		
    		$scope.messages.push(chatWindow);
    		$scope.activeChatWindow = chatWindow;
    	}
    };
    
    $scope.getUsersListTextHeader = function () {
    	if ($scope.isSignedIn && $scope.user) {
    		return $scope.user.id;
    	} else {
    		return "Users";
    	}
    };
    
    $scope.signOut = function () {
    	socketsService.emit("UserChatOffline", { id: $scope.user.id });
		$scope.isSignedIn = false;
		localStorageService.remove("userId");
    };
    
    $scope.signIn = function () {
    	if ($scope.user && $scope.user.id) {
    		socketsService.emit("UserChatOnline", { userId: $scope.user.id });
    		localStorageService.set("userId", $scope.user.id);
    		$scope.isSignedIn = true;
    	}
    };
    
    $scope.init = function () {
    	var id = localStorageService.get("userId");
    	
    	if (id) {
    		$scope.user.id = id;
    		$scope.signIn();
    	} else {
    		$scope.isSignedIn = false;
    	}
    	
    	socketsService.emit("UserData");
    };
    
    $scope.init();
}]);
