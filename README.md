# mqtt-request

Latest Version: 1.0.0

`mqtt-request` is a HTTP like library, you can use it request anything like http.

## Install 

```
npm install mqtt mqtt-request
```

you need install `mqtt` 

## Usage

It is easy to use. There is only two instance methods `request()` and `response()`

`response()` is for server and `request()` is for client.

### Example

```javascript
const mqtt = require('mqtt')
const MqttRequest = require('mqtt-request').default

const client = new mqtt("mqtt://mqtt.example.com")
const r = new MqttRequest(client);

// for server
r.response("hello/world", (payload) => {
  return "hello " + payload.toString();
})

mqtt.on('connect', () => {
  // for client
  r.request("hello/world", 
  (payload) => {
    console.log("Get response:" + payload.toString());
  }, 
  "Robot" // <-- this is payload
  )
})
```

## How to work

When client send request, the `request()` method will add extra message to raw topic

*e.g.*

Raw topic `hello/world`

Transform to `hello/world/@request/{uuid}` the `{uudi}` is generate with `nanoid` and `@request` is sign it is a request messsage. 

After send the request message, the request will be push to `request queue` and add `expires` property to this request. When `expires` is larger than `now` the `request` will be remove from `request queue` and THIS `request` is unusable.

Server get the request and generate response topic `hello/world/@response/{uuid}`, then send the topic to client with payload or nothing.

## Methods

#### MqttRequest(mqtt)
 
*mqtt* the mqtt instance

#### MqttRequest#request(topic, callback, payload)

*topic* [string] request topic, you can use anyhing word expect `@request` or `@response`

*callback* [Function] callback function, `function callback(payload)` the payload is raw mqtt payload

*payload* [any] anything you want to send server

#### MqttRequest#response(topic, callback)

*topic* [string] response topic

*callback* [Function] callback function, `function callback(payload)` the payload is sent to server,
and if you want send payload to client, then you must `return` data at `callback` method, the data can be anything.

Example
```javascript
r.response("hello/world", (payload) => {return payload.toString()})
```

if you return nothing, there will no payload send to client, but the client always received the response!



