Crypto challenges
=================

Prerequisites
-------------

* npm
* HTTPie
* Docker
* AWS CLI
* sam

Development
-----------

* `nodemon --exec sam build` rebuilds a Docker image each time the code changes. It's a good idea to have this running as you develop
* `sam local start-api -n locals.json` to start a local Docker image with your Lambda code

Deployment
----------

`sam deploy`
