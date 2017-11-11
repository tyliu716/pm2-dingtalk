# pm2-dingtalk

This is a PM2 Module for sending events & logs from your PM2 processes to Dingtalk.

## Install

To install and setup pm2-dingtalk, run the following commands:

```
pm2 install tyliu716/pm2-dingtalk
pm2 set pm2-dingtalk:dingtalk_url https://dingtalk_custom_robot_url
```

To get the Dingtalk URL, you need to setup an Incoming Webhook. More details on how to set this up can be found here: https://open-doc.dingtalk.com/docs/doc.htm?spm=a219a.7629140.0.0.karFPe&treeId=257&articleId=105735&docType=1

## Configure

The following events can be subscribed to:

- log - All standard out logs from your processes. Default: false
- error - All error logs from your processes. Default: true
- kill - Event fired when PM2 is killed. Default: true
- exception - Any exceptions from your processes. Default: true
- restart - Event fired when a process is restarted. Default: false
- delete - Event fired when a process is removed from PM2. Default: false
- stop - Event fired when a process is stopped. Default: false
- restart overlimit - Event fired when a process is reaches the max amount of times it can restart. Default: true
- exit - Event fired when a process is exited. Default: false
- start -  Event fired when a process is started. Default: false
- online - Event fired when a process is online. Default: false

You can simply turn these on and off by setting them to true or false using the PM2 set command.

```
pm2 set pm2-dingtalk:log true
pm2 set pm2-dingtalk:error false
```

## Contributing

## Release Historyf

## Inspired by pm2-slack
https://github.com/mattpker/pm2-slack
