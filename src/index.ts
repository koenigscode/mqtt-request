import nanoid from "nanoid"

export type MqttRequestQueueItem = {
  uuid: string
  callback: Function
  expires: number
}

export type MqttResponseQueueUtem = {
  [topic: string]: Function
}

export default class MqttRequest {
  static timeout = 200 // Request timeout, default is 200ms
  static publishOptions = undefined // set to e.g. { qos: 1 } to override default publish options

  private _mqtt: any
  private _cleanTimer: any
  private _queue: MqttRequestQueueItem[] = []
  private _reponseQueue: MqttResponseQueueUtem = {}

  /**
   * Constructor
   * @param mqttClient Mqtt Client object
   */
  public constructor(mqttClient: any) {
    this._mqtt = mqttClient
    this._mqtt.on("message", (topic: string, message: any) => {
      this._handleMessage(topic, message)
    })
    this._cleanTimer = setInterval(
      this.__cleanQueue.bind(this),
      MqttRequest.timeout * 5
    )
  }

  public request(
    topic: string,
    callback: (message: any) => void,
    payload?: any
  ) {
    const uuid = nanoid()
    const expires = Date.now() + MqttRequest.timeout
    const _responseTpoic = this._makeResponseTopic(topic)
    this._mqtt.subscribe(_responseTpoic)

    // Push callback function to queue
    const queueItem: MqttRequestQueueItem = { uuid, callback, expires }
    this._queue.push(queueItem)

    // send topic
    const _requestTopic = this._makeRequestTopic(topic, uuid)
    this._mqtt.publish(
      _requestTopic,
      payload ?? null,
      MqttRequest.publishOptions
    )
  }

  public response(topic: string, callback: (payload: any) => void) {
    const _requestTopic = this._makeRequestTopicForRespose(topic)
    this._mqtt.subscribe(_requestTopic)

    const sharedSubscriptionRegex = /^\$share\/[^\/]+\/([^\/]+\/.*)$/
    const match = topic.match(sharedSubscriptionRegex)
    if (match) {
      // uses shared subscription
      topic = match[1]
    }

    this._reponseQueue[topic] = callback
  }

  private _handleMessage(topic: string, payload: any): void {
    if (topic.search("@request") >= 0) {
      this.__handleRequest(topic, payload)
    }
    if (topic.search("@response") >= 0) {
      this.__handleResponse(topic, payload)
    }
  }

  private __handleRequest(topic: string, payload: any) {
    const idx = topic.search("@request")
    const _topic = topic.substring(0, idx - 1)
    const _uuid = topic.substr(idx + 9)
    const _callback = this._reponseQueue[_topic]
    const _payload = _callback ? _callback(payload) : null

    this._mqtt.publish(this._makeResponseTopicWithUUID(_topic, _uuid), _payload)
  }

  private __handleResponse(topic: string, payload: any) {
    const now = Date.now()
    const _segment = topic.split("/")
    const _uuid = _segment[_segment.length - 1]
    const idx = this._queue.findIndex((it) => it.uuid === _uuid)
    if (idx >= 0) {
      const { callback, expires } = this._queue[idx]
      expires > now
        ? callback(payload)
        : (this._queue = this._queue.splice(idx, 1))
    }
  }

  private _makeResponseTopic(topic: string): string {
    return topic.endsWith("/") ? `${topic}@response/#` : `${topic}/@response/#`
  }

  private _makeResponseTopicWithUUID(topic: string, uuid: string): string {
    return topic.endsWith("/")
      ? `${topic}@response/${uuid}`
      : `${topic}/@response/${uuid}`
  }

  private _makeRequestTopicForRespose(topic: string): string {
    return topic.endsWith("/") ? `${topic}@request/#` : `${topic}/@request/#`
  }

  private _makeRequestTopic(topic: string, uuid: string): string {
    return topic.endsWith("/")
      ? `${topic}@request/${uuid}`
      : `${topic}/@request/${uuid}`
  }

  /**
   * Remove request which's timeout is out
   */
  private __cleanQueue() {
    const now = Date.now()
    this._queue = this._queue.reduce(
      (t, it) => (it.expires < now ? [...t, it] : t),
      <MqttRequestQueueItem[]>[]
    )
  }
}
