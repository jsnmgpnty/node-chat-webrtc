messenger.directive("chatWindow", ["$rootScope", "socketsService", "$interval", "$uibModal",
function ($rootScope, socketsService, $interval, $uibModal) {
    var ctrlFn = function ($scope, $rootScope, socketsService) {
        $scope.newMessage = "";

        $scope.uploadedFile = null;

        $scope.uploadedFileConfirmation = false;

        $scope.receivedFileArray = [];

        $scope.receivedFileData = null;

        $scope.isOtherPerson = function (message) {
            if (message) {
                if (message.sender === $scope.userId) {
                    return "";
                } else {
                    return "other-person";
                }
            } else {
                return "";
            }
        };

        $scope.sendChat = function () {
            var msg = {
                sender: $scope.userId,
                recipient: $scope.chatMateId,
                message: $scope.newMessage
            };

            socketsService.emit("SendChatMessage", msg);
            $scope.messages.push(msg);
            $scope.newMessage = "";
        };

        $rootScope.$on("SendFile", function (ev, data) {
            $scope.receivedFileArray.push(data);
        });

        $rootScope.$on("FileData", function (ev, data) {
            $scope.receivedFileData = data;
        });

        $scope.$watchCollection("receivedFileArray", function () {
            if ($scope.receivedFileData) {
                var chunks = Math.ceil($scope.receivedFileData.size / 5000);
                if ($scope.receivedFileArray.length < chunks)
                    return;

                var encodedFile = "";
                for (var i = 0; i < $scope.receivedFileArray.length; i++) {
                    console.log($scope.receivedFileArray[i].file.length);
                    encodedFile += $scope.receivedFileArray[i].file;
                }

                var bytes = new Uint8Array(encodedFile.length);
                for (var j = 0; j < encodedFile.length; j++) {
                    bytes[j] = encodedFile.charCodeAt(j);
                }

                var file = new Blob([bytes], {
                    type: $scope.receivedFileData.type
                });
                var url = window.URL.createObjectURL(file);

                var a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = url;
                a.download = $scope.receivedFileData.name;
                a.click();
                window.URL.revokeObjectURL(url);

                $scope.receivedFileArray = [];
            }
        });

        $scope.$watch("uploadedFile", function () {
            if ($scope.uploadedFile && !$scope.uploadedFileConfirmation) {
                $scope.uploadedFileConfirmation = true;
                var file = $scope.uploadedFile;
                var minCtr = 1;
                var maxCtr = 5000;
                var order = 1;
                var goraLang = true;

                var fileData = {
                    sender: $scope.userId,
                    recipient: $scope.chatMateId,
                    name: file.name,
                    size: file.size,
                    type: file.type
                };
                socketsService.emit("FileData", fileData);

                var msg = {
                    sender: $scope.userId,
                    recipient: $scope.chatMateId,
                    message: file.name
                };
                socketsService.emit("SendChatMessage", msg);
                $scope.messages.push(msg);

                do {
                    if (maxCtr > file.size) {
                        maxCtr = file.size;
                        getBlob(minCtr, maxCtr, order, file);
                        goraLang = false;
                        $scope.uploadedFileConfirmation = false;
                        $scope.uploadedFile = null;
                    } else {
                        getBlob(minCtr, maxCtr, order, file);
                    }

                    order += 1;
                    minCtr += 5000;
                    maxCtr += 5000;
                } while (goraLang);
            }
        }, true);

        var getBlob = function (sliceStart, sliceEnd, order, file) {
            if (!file) {
                return;
            }

            var start = parseInt(sliceStart) || 0;
            var stop = parseInt(sliceEnd) || file.size - 1;

            var reader = new FileReader();
            reader.onloadend = function (evt) {
                if (evt.target.readyState == FileReader.DONE) {
                    socketsService.emit("SendFile", {
                        sender: $scope.userId,
                        recipient: $scope.chatMateId,
                        order: order,
                        file: evt.target.result,
                        size: stop
                    });
                }
            };

            var blob = file.slice(start - 1, stop);
            reader.readAsBinaryString(blob);
        };

    };
    ctrlFn.$inject = ["$scope", "$rootScope", "socketsService"];

    var linkFn = function(scope, elem, attr) {
        var videoModalController = [
            "$scope", "$rootScope", "$uibModalInstance", "isCaller", function($scope, $rootScope, $uibModalInstance, isCaller) {
                var peerConnection;
                var isVideoReady = false;
                var peerConnectionConfig = {
                    'iceServers': [
                        {
                            'url': 'stun:stun.services.mozilla.com'
                        }, {
                            'url': 'stun:stun.l.google.com:19302'
                        }
                    ]
                };

                navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
                window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
                window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
                window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
				
				var localStream;
                var localVideo;
                var remoteVideo;

                var constraints = {
                    video: true,
                    audio: true
                };
                
                function resetVideo() {
                	if (localVideo) localVideo.src = null;
                	if (remoteVideo) remoteVideo.src = null;
                	if (peerConnection) peerConnection = null;
                };

                function getUserMediaSuccess(stream) {
                    localStream = stream;
                    
                    var localVideoInterval = $interval(function () {
                    	localVideo = document.getElementById('localVideo');
                    	if (localVideo) {
                    		$interval.cancel(localVideoInterval);
                    		localVideoInterval = undefined;
                    		
	                    	localVideo.src = window.URL.createObjectURL(stream);
	                    	isVideoReady = true;
	                    }
                    }, 250);
                }

                function getUserMediaError(error) {
                    console.log(error);
                }

                function gotDescription(description) {
                    peerConnection.setLocalDescription(description, function() {
                        socketsService.emit("VideoDescription", {
                            recipient: scope.chatMateId,
                            sdp: description
                        });
                    }, function() {
                        console.log('set description error');
                    });
                }

                function gotIceCandidate(event) {
                    if (event.candidate != null) {
                        socketsService.emit("VideoIceCandidate", {
                            recipient: scope.chatMateId,
                            ice: event.candidate
                        });
                    }
                }

                function gotRemoteStream(event) {
                    var remoteVideoInterval = $interval(function () {
                    	remoteVideo = document.getElementById('remoteVideo');
                    	if (remoteVideo && isVideoReady) {
                    		$interval.cancel(remoteVideoInterval);
                    		remoteVideoInterval = undefined;
                    		
                    		remoteVideo.src = window.URL.createObjectURL(event.stream);
	                    }
                    }, 250);
                }

                function createOfferError(error) {
                    console.log(error);
                }

                function createAnswerError(error) {
                    console.log(error);
                }

                $rootScope.$on("VideoDescription", function(ev, data) {
                    var open = $interval(function() {
                        if (peerConnection && isVideoReady) {
                            $interval.cancel(open);
                            open = undefined;
                            peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp), function() {
                                peerConnection.createAnswer(gotDescription, createAnswerError);
                            });
                        }
                    }, 250);
                });

                $rootScope.$on("VideoIceCandidate", function(ev, data) {
                    var open = $interval(function() {
                        if (peerConnection && isVideoReady) {
                            $interval.cancel(open);
                            open = undefined;
                            peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
                        }
                    }, 250);
                });
                	                
                $rootScope.$on("VideoDisconnected", function(ev, data) {
                    resetVideo();
                });

                if (navigator.getUserMedia) {
                    navigator.getUserMedia(constraints, getUserMediaSuccess, getUserMediaError);
                } else {
                    alert('Your browser does not support getUserMedia API');
                }

                var videoCheckInterval = $interval(function() {
                    if (isVideoReady) {
                        $interval.cancel(videoCheckInterval);
                        videoCheckInterval = undefined;

                        peerConnection = new RTCPeerConnection(peerConnectionConfig);
                        peerConnection.onicecandidate = gotIceCandidate;
                        peerConnection.onaddstream = gotRemoteStream;
                		peerConnection.addStream(localStream);
						
						if (isCaller) {
                        	peerConnection.createOffer(gotDescription, createOfferError);
							socketsService.emit("VideoOffer", {
	                            recipient: scope.chatMateId,
	                            sender: scope.userId
	                        });
						}
                    }
                }, 250);
                
                $scope.cancel = function () {
                	resetVideo();
                	
                	socketsService.emit("VideoDisconnected", {
                        recipient: scope.chatMateId,
                        sender: scope.userId
                    });
			    	$uibModalInstance.dismiss('cancel');
				};
            }
        ];

        var videoModalTemplate =
            "<div class='modal-body'>" +
            	"<h3>Video call with " + scope.chatMateId + "</h3>" +
                "<div class='video-container'>" +
                    "<video id='localVideo' autoplay muted class='hidden-xs hidden-sm'></video>" +
                    "<video id='remoteVideo' autoplay muted'></video>" +
                "</div>" +
                "<div class='btn btn-danger' ng-click='cancel()'>" +
                    "<i class='fa fa-phone fa-3x'></i>" +
                "</div>" +
            "</div>";

        scope.startVideo = function(isCaller) {
            var videoModalInstance = $uibModal.open({
	            animation: true,
	            template: videoModalTemplate,
	            controller: videoModalController,
	            size: "lg",
	            windowClass: "modal-chat-window",
	            resolve: {
			        isCaller: function () {
			          return isCaller;
			        }
		      	}
	        });
        };
        
        $rootScope.$on("LaunchVideoChat", function() {
           	scope.startVideo(false); 
        });
    };

    var template = 
        "<div class='chat-messages-content'>" + 
            "<div class='chat-messages'>" + 
                "<div ng-repeat='message in messages' class='chat-message'>" + 
                    "<div class='chat-message-item' ng-class='isOtherPerson(message)'>" + 
                        "<p>{{message.message}}</p>" + 
                    "</div>" + 
                "</div>" + 
            "</div>" + 
            "<hr />" + 
            "<div class='chat-messages-new'>" + 
                "<div class='row'>" + 
                    "<div class='col-xs-12'>" + 
                        "<textarea ng-model='newMessage'></textarea>" + 
                        "<span class='fa fa-paper-plane fa-2x' ng-click='sendChat()'></span>" + 
                        "<label class='fa fa-file fa-2x' ng-click='upload()'><input class='btn-upload' type='file' file-read='uploadedFile' /></label>" +
                        "<span class='fa fa-video-camera fa-2x' ng-click='startVideo(true)'></span>" + 
                    "</div>" + 
                "</div>" +
            "</div>" + 
        "</div>";

return {
    controller: ctrlFn,
    link: linkFn,
    template: template,
    restrict: "EA",
    replace: true,
    scope: {
        messages: "=",
        chatMateId: "=",
        userId: "="
    }
};
}]);