/**
 * A transport using websockets
 *
 * @author Joe Mills
 * @module transports/websocket
 */

export default class WebsocketTransport {
  constructor(get_message, patch_message) {
    this.get_message = get_message;
    this.patch_message = patch_message;
  }
}