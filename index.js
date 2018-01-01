'use strict';

var os = require('os');
var pm2 = require('pm2');
var pmx = require('pmx');
var Urllib = require("urllib");
const RateLimiter = require("rolling-rate-limiter");

// Get the configuration from PM2
var conf = pmx.initModule();

// Set the events that will trigger the color red
var redEvents = ['stop', 'exit', 'delete', 'error', 'kill', 'exception', 'restart overlimit', 'suppressed'];

// create the message queue
var messages = [];

// create the suppressed object for sending suppression messages
var suppressed = {
    isSuppressed: false,
    date: new Date().getTime()
};

var limit_interval=conf.interval?conf.interval:600000;
var limit_maxInInterval=conf.maxInInterval?conf.maxInInterval:3;
var limit_minDifference=conf.minDifference?conf.minDifference:1000;
//3 times send per 10 mins
const ding_limiter = RateLimiter({
    interval: 600000, // in miliseconds
    maxInInterval: 3,
    minDifference: 1000 // optional: the minimum time (in miliseconds) between any two actions
});


function attemptAction(message) {

    var timeLeft = ding_limiter(message);
    if (timeLeft > 0) {
    } else {
        return true;
    }

}

function push(data) {
    var msg=JSON.stringify(data);
    var limit=attemptAction("DING_PUSH:"+msg);

    if(!limit){
        return;
    }else{
        messages.push({
            description: msg
        });
    }
}

var moduelName = 'pm2-dingtalk';

function sendDingtalk(message) {
    var name = message.name;
    var event = message.event;
    var description = message.description;

    // If a Dingtalk robot URL is not set, we do not want to continue and nofify the user that it needs to be set
    if (!conf.dingtalk_url) return console.error("There is no Dingtalk URL set, please set the Dingtalk URL: 'pm2 set pm2-dingtalk:dingtalk_url https://dingtalk_url'");

    // The JSON payload to send to the Webhook
    var payload = {
        "msgtype": "text",
        "text": {
            "content": 'PM2 Event Notify \n\n' + name + ' \n ' + event + ' \n ' + description
        },
        "at": {
            "atMobiles": [],
            "isAtAll": false
        }
    };

    try {
        Urllib.request(conf.dingtalk_url, {
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST',
            timeout: 60000,
            data: payload
        }, function (err, data, res) {
            if (err) return console.error(err);
            console.log(data.toString());
            // {"errcode":0,"errmsg":"ok"}
        });
    } catch (error) {

    }
}

// Function to process the message queue
function processQueue() {

    // If we have a message in the message queue, removed it from the queue and send it to dingtalk
    if (messages.length > 0) {
        sendDingtalk(messages.shift());
    }

    // If there are over 10 messages in the queue, send the suppression message if it has not been sent and delete all the messages in the queue after 10
    if (messages.length > 10) {
        if (!suppressed.isSuppressed) {
            suppressed.isSuppressed = true;
            suppressed.date = new Date().getTime();
            sendDingtalk({
                name: 'PM2 Notice:',
                event: 'suppressed',
                description: 'Messages are being suppressed due to rate limiting.'
            });
        }
        messages.splice(10, messages.length);
    }

    // If the suppression message has been sent over 1 minute ago, we need to reset it back to false
    if (suppressed.isSuppressed && suppressed.date < (new Date().getTime() - 60000)) {
        suppressed.isSuppressed = false;
    }

    // Wait 10 seconds and then process the next message in the queue
    setTimeout(function () {
        processQueue();
    }, 10000);
}

// Start listening on the PM2 BUS
pm2.launchBus(function (err, bus) {

    // Listen for process logs
    if (conf.log) {
        bus.on('log:out', function (data) {
            if (data.process.name !== moduelName) {
                // messages.push({
                push({
                    name: data.process.name,
                    event: 'log',
                    description: JSON.stringify(data.data)
                });
            }
        });
    }

    // Listen for process errors
    if (conf.error) {
        bus.on('log:err', function (data) {
            if (data.process.name !== moduelName) {
                // messages.push({
                push({
                    name: data.process.name,
                    event: 'error',
                    description: JSON.stringify(data.data)
                });
            }
        });
    }

    // Listen for PM2 kill
    if (conf.kill) {
        bus.on('pm2:kill', function (data) {
            // messages.push({
            push({
                name: 'PM2',
                event: 'kill',
                description: data.msg
            });
        });
    }

    // Listen for process exceptions
    if (conf.exception) {
        bus.on('process:exception', function (data) {
            if (data.process.name !== moduelName) {
                // messages.push({
                push({
                    name: data.process.name,
                    event: 'exception',
                    description: JSON.stringify(data.data)
                });
            }
        });
    }

    // Listen for PM2 events
    bus.on('process:event', function (data) {
        if (conf[data.event]) {
            if (data.process.name !== moduelName) {

                // messages.push({
                push({
                    name: data.process.name,
                    event: data.event,
                    description: 'The following event has occured on the PM2 process ' + data.process.name + ': ' + data.event
                });
            }
        }
    });

    // Start the message processing
    processQueue();

});
