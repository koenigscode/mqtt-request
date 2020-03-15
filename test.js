const MqttRequest = require('./build/index').default;
const mqtt = require("mqtt");

const client1 = mqtt.connect("mqtt://127.0.0.1");
const client2 = mqtt.connect("mqtt://127.0.0.1")
const r = new MqttRequest(client2);
const r2 = new MqttRequest(client1);

r2.response("hello/world", (payload) => {
  console.log('Response Hello World',payload.toString());
return `hello ${payload.toString()}`})

client1.on('connect', () => {
  console.log("Connected #1")
})

client2.on("connect", () => {
  console.log("Connected #2")
  setTimeout(() => {
    r.request("hello/world", (message) => {
      console.log('Get Result', message.toString())
    }, "aokihu")
  }, 100)
})
