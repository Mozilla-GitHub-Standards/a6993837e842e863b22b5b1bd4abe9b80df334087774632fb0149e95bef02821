AutomationHelpers = function() {
    var callbackDict = {};
    
    var workerDict = {};
    var workerParams = {};
    
    var workerID;
    
    self.port.on("set_worker_id",function(msg) {
        workerID = msg.workerID;
    });
    
    self.port.on("fetch_setting_callback", function(msg) {
        getAndRmCallback(msg.callback_id)(msg.value);
    });
    
    self.port.on("set_params", function(msg) {
        workerParams = msg.params;
    });
    
    self.port.on("start_worker", function(msg) {
        if (workerDict[msg.worker])
            workerDict[msg.worker]();
    });
    
    function saveCallback(callback) {
        // Gen random UUID to associate with this callback
        const randUUID = uuid.v4();
        callbackDict[randUUID] = callback;
        return randUUID;
    }
    
    function getAndRmCallback(callbackID) {
        var callback = callbackDict[callbackID];
        delete callbackDict[callbackID];
        return callback;
    }
    
    // TODO
    function callAndRmCallback(callbackID) {
        var callbackFunc = getAndRmCallback(callbackID);
        // callbackFunc.apply({},)
    }
    
    function postMessageForWorker(msg) {
        msg['worker_id'] = workerID;
        self.postMessage(msg);
    }
    
    return {
            getParams: function() {
                return workerParams;
            },
            openNewTab: function(url) {
            },
            assert: function(assertion) {
                if (!assertion) {
                    postMessageForWorker({
                        type: 'raise_error',
                        error: 'assertion_failed'
                    });
                }
                return Boolean(assertion);
            },
            // Call a function at an interval until it returns something truthy or after maxTries attempts.
            pollUntilTrue: function(pollFunc,successCallback,pollInterval,maxTries,failureCallback) {
                // Poll by .5 sec by default
                if (!pollInterval)
                    pollInterval = 500;
                if (!maxTries)
                    maxTries = 50;
                var tries = 0;
                var pollID = setInterval(function() {
                    if (pollFunc()) {
                        clearInterval(pollID);
                        if (successCallback)
                            successCallback();
                        return;
                    }
                    maxTries++;
                    if (tries >= maxTries) {
                        clearInterval(pollID);
                        if (failureCallback)
                            failureCallback();
                    }
                }, pollInterval);
            },
            forSetting: function(setting,callback) {

                // TODO: self.port.emit?
                postMessageForWorker({
                    type: 'fetch_setting',
                    setting_name: setting,
                    callback_id: saveCallback(callback)
                });
            },
            finishAutomation: function(workerID) {
                postMessageForWorker({
                    type: 'finish_automation',
                    worker_id: workerID
                });
            },
            registerError: function(error) {
                postMessageForWorker({
                    type: 'raise_error',
                    error: error
                });
            },
            registerWorker: function(id, func) {
                postMessageForWorker({
                    type: 'register_worker',
                    id: id,
                    func: 'var __automate = ' + func.toString() + '; __automate();'
                });
                workerDict[id] = func;
            },
            returnValue: function(key,val) {
                postMessageForWorker({
                    type: 'return_value',
                    key: key,
                    value: val
                });
            },
            runWorker: function(id, url, visual) {
                postMessageForWorker({
                    type: 'run_worker',
                    id: id,
                    url: url,
                    visual: visual
                });
            },
            waitForReady: function(callback) {
                $(unsafeWindow.document).bind('ready.watchdog', function() {
                        $(unsafeWindow.document).unbind('ready.watchdog');
                        callback();
                    });
            },
            simulateClick: function(elements) {
                if (!elements) return;
                if (!elements.length) elements = [elements];
                for (var elemIdx = 0; elemIdx < elements.length; elemIdx++) {
                    var evt = window.document.createEvent('MouseEvents');
                    evt.initMouseEvent('click', true, true, window.document.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
                    elements[elemIdx].dispatchEvent(evt);
                }
            },
            simulateKeypress: function(elem, character) {
                // Reference: http://stackoverflow.com/questions/961532/firing-a-keyboard-event-in-javascript
                jQuery.event.trigger({ type : 'keypress', which : character.charCodeAt(0) });
            },
            focusAndType: function(elem, stringToType) {
                jQuery(elem).focus();
                for (var charIdx in stringToType) {
                    this.simulateKeypress(elem,stringToType[charIdx]);
                }
            }
        };  
}();