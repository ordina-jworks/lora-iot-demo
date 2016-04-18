var Proximus = function() {
    var https           = require("https");
    var ws              = require("nodejs-websocket");
    var logger          = require("../../logging/logger").makeLogger("SERV-PROXIMUS--");

    //Private variables.
    var host            = 'api.enabling.be';
    var auth            = 'Bearer ' + '';
    var socketServer    = null;

    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Public functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    this.setupSocket = function() {
        logger.INFO("Setting up socket...");
        socketServer = ws.createServer(onConnection).listen(7081);
    };

    this.devices = function(request, response) {
        logger.INFO("Listing registered LoRa devices.");

        var options = {
            host: host,
            path: '/seaas/0.0.1/device/list?owner=kevin.vandenabeele@ordina.be',
            method: 'GET',
            headers: {
                'Authorization' :   auth,
                'content-type'  :   'application/json'
            }
        };

        https.request(options, function(res) {
            var data = '';
            res.setEncoding('utf8');

            res.on('data', function(chunk) {
                data += chunk;
            });
            res.on('end', function() {
                var result = null;
                if(this.statusCode !== 200) {
                    result = data;
                } else {
                    result = JSON.parse(data);
                }

                response.write(JSON.stringify(result, null, 4));
                response.end();
            });
        }).end();
    };

    this.buttonTrigger = function(request, response) {
        logger.INFO("Request received for buttonTrigger...");

        switch (request.method) {
            case "GET":
                response.writeHead(200, {'Content-Type': 'text/plain'});
                response.write("To use this service, post JSON data to it!", null, 4);
                response.end();
                break;
            case "POST":
                processData(request, response);
                broadcastMessage({buttonPressed : true});
                break;
        }
    };


    /*-------------------------------------------------------------------------------------------------
     * ------------------------------------------------------------------------------------------------
     *                                        Private functions
     * ------------------------------------------------------------------------------------------------
     ------------------------------------------------------------------------------------------------*/
    function processData(request, response) {
        var fullBody = "";
        request.on('data', function(chunk) {
            fullBody += chunk.toString();
        });

        request.on('end', function() {
            try {
                response.writeHead(200, {'Content-Type': 'text/plain'});

                //Process the data.
                var data = JSON.parse(fullBody);
                logger.INFO(JSON.stringify(data));

            } catch (error) {
                response.writeHead(500, {'Content-Type': 'text/plain'});
                response.write("Cannot parse request body! Make sure that it is proper JSON!");
            }
            response.end();
        });
    }

    function onConnection(connection) {
        logger.DEBUG("New connection");

        try {
            connection.on("text", onMessageFromConnection);
            connection.on("close", onConnectionClosed);
        } catch (error) {
            logger.ERROR("Cannot handle new connection!");
        }
    }

    function onMessageFromConnection(message) {
        try {
            logger.DEBUG("Message from connection: " + message);
            var data = JSON.parse(message);

            //We ignore any messages from the clients, but we log them just in case...
            logger.DEBUG("Message received from websocket client: " + data);
        } catch(error) {
            logger.ERROR("An error occurred during web socket message handling...");
            logger.ERROR("Continuing, not critical!");
        }
    }

    function broadcastMessage(message) {
        logger.DEBUG("Broadcasting message.");

        socketServer.connections.forEach(
            function (connection) {
                connection.sendText(JSON.stringify(message, null, 4))
            }
        );
    }

    function onConnectionClosed(code, reason) {
        logger.DEBUG("Connection closed");
    }
};

module.exports = Proximus;