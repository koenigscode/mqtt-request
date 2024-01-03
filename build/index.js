"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nanoid_1 = __importDefault(require("nanoid"));
class MqttRequest {
    /**
     * Constructor
     * @param mqttClient Mqtt Client object
     */
    constructor(mqttClient) {
        this._queue = [];
        this._reponseQueue = {};
        this._mqtt = mqttClient;
        this._mqtt.on("message", (topic, message) => {
            this._handleMessage(topic, message);
        });
        this._cleanTimer = setInterval(this.__cleanQueue.bind(this), MqttRequest.timeout * 5);
    }
    request(topic, callback, payload) {
        const uuid = (0, nanoid_1.default)();
        const expires = Date.now() + MqttRequest.timeout;
        const _responseTpoic = this._makeResponseTopic(topic);
        this._mqtt.subscribe(_responseTpoic);
        // Push callback function to queue
        const queueItem = { uuid, callback, expires };
        this._queue.push(queueItem);
        // send topic
        const _requestTopic = this._makeRequestTopic(topic, uuid);
        this._mqtt.publish(_requestTopic, payload !== null && payload !== void 0 ? payload : null);
    }
    response(topic, callback) {
        const _requestTopic = this._makeRequestTopicForRespose(topic);
        this._mqtt.subscribe(_requestTopic);
        const sharedSubscriptionRegex = /^\$share\/[^\/]+\/([^\/]+\/.*)$/;
        const match = topic.match(sharedSubscriptionRegex);
        if (match) {
            // uses shared subscription
            topic = match[1];
        }
        this._reponseQueue[topic] = callback;
    }
    _handleMessage(topic, payload) {
        if (topic.search("@request") >= 0) {
            this.__handleRequest(topic, payload);
        }
        if (topic.search("@response") >= 0) {
            this.__handleResponse(topic, payload);
        }
    }
    __handleRequest(topic, payload) {
        const idx = topic.search("@request");
        const _topic = topic.substring(0, idx - 1);
        const _uuid = topic.substr(idx + 9);
        const _callback = this._reponseQueue[_topic];
        const _payload = _callback ? _callback(payload) : null;
        this._mqtt.publish(this._makeResponseTopicWithUUID(_topic, _uuid), _payload);
    }
    __handleResponse(topic, payload) {
        const now = Date.now();
        const _segment = topic.split("/");
        const _uuid = _segment[_segment.length - 1];
        const idx = this._queue.findIndex((it) => it.uuid === _uuid);
        if (idx >= 0) {
            const { callback, expires } = this._queue[idx];
            expires > now
                ? callback(payload)
                : (this._queue = this._queue.splice(idx, 1));
        }
    }
    _makeResponseTopic(topic) {
        return topic.endsWith("/") ? `${topic}@response/#` : `${topic}/@response/#`;
    }
    _makeResponseTopicWithUUID(topic, uuid) {
        return topic.endsWith("/")
            ? `${topic}@response/${uuid}`
            : `${topic}/@response/${uuid}`;
    }
    _makeRequestTopicForRespose(topic) {
        return topic.endsWith("/") ? `${topic}@request/#` : `${topic}/@request/#`;
    }
    _makeRequestTopic(topic, uuid) {
        return topic.endsWith("/")
            ? `${topic}@request/${uuid}`
            : `${topic}/@request/${uuid}`;
    }
    /**
     * Remove request which's timeout is out
     */
    __cleanQueue() {
        const now = Date.now();
        this._queue = this._queue.reduce((t, it) => (it.expires < now ? [...t, it] : t), []);
    }
}
MqttRequest.timeout = 200; // Request timeout, default is 200ms
exports.default = MqttRequest;
