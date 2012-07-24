var addontab = require('addon-page');
var passwords = require('passwords_mock');
var self = require('self');
var tabs = require('tabs');
var widget = require('widget').Widget;

function openManager() {
    tabs.open({
        url: self.data.url('index.html'),
        onReady: function(tab) {
            var worker = tab.attach({
                contentScriptFile: [self.data.url('js/visualhashing_util.js'),self.data.url('js/manager.js')]
            });

            passwords.getLogins({
                onComplete: function(credentials) {
                    credentials.forEach(function(credential) {
                        var clientCredential = {
                            site: credential.url,
                            username: credential.username,
                            password: credential.password,
                            age: credential.lastChanged,
                            strength: '||||' // TODO
                        };

                        worker.port.emit('credential', clientCredential);
                    });
                }
            });
        }
    });
}

widget({
    id: 'watchdog-manager',
    label: 'Watchdog Manager',
    width: 30,
    content: 'WD',
    onClick: openManager
});
