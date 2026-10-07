// Minimal JSON-RPC / LSP transport over stdio (Content-Length framing).
//
// No external dependencies: this keeps the language server self contained so
// it can run with Zed's bundled Node (`zed_extension_api::node_binary_path`).

const HEADER_SEPARATOR = '\r\n\r\n';

class Connection {
  constructor(readable, writable) {
    this.writable = writable;
    this.buffer = Buffer.alloc(0);
    this.handlers = new Map();
    this.disposers = new Map();
    this._nextId = 1;
    this._pending = new Map();

    readable.on('data', chunk => this._onData(chunk));
    readable.on('error', () => {
      /* ignore */
    });
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
    return () => {
      const list = this.handlers.get(method) || [];
      this.handlers.set(
        method,
        list.filter(h => h !== handler)
      );
    };
  }

  // A request method that is expected to have exactly one handler.
  onRequest(method, handler) {
    this.handlers.set(method, [handler]);
  }

  _dispatch(method, params) {
    const list = this.handlers.get(method) || [];
    for (const handler of list) {
      handler(params);
    }
  }

  _write(obj) {
    const json = JSON.stringify(obj);
    const payload = Buffer.from(json, 'utf8');
    const frame = Buffer.concat([
      Buffer.from(`Content-Length: ${payload.length}${HEADER_SEPARATOR}`, 'ascii'),
      payload,
    ]);
    this.writable.write(frame);
  }

  notify(method, params) {
    this._write({ jsonrpc: '2.0', method, params });
  }

  request(method, params) {
    const id = this._nextId++;
    return new Promise(resolve => {
      this._pending.set(id, resolve);
      this._write({ jsonrpc: '2.0', id, method, params });
    });
  }

  _onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      const headerEnd = this.buffer.indexOf(HEADER_SEPARATOR);
      if (headerEnd === -1) return;

      const header = this.buffer.slice(0, headerEnd).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        // Malformed header: drop what we have and wait for more.
        this.buffer = this.buffer.slice(headerEnd + HEADER_SEPARATOR.length);
        continue;
      }

      const length = parseInt(match[1], 10);
      const bodyStart = headerEnd + HEADER_SEPARATOR.length;
      if (this.buffer.length < bodyStart + length) return;

      const body = this.buffer.slice(bodyStart, bodyStart + length).toString('utf8');
      this.buffer = this.buffer.slice(bodyStart + length);

      let message;
      try {
        message = JSON.parse(body);
      } catch (err) {
        continue;
      }
      this._handleMessage(message);
    }
  }

  _handleMessage(message) {
    // Response to one of our own requests.
    if (message.id !== undefined && message.method === undefined) {
      const resolve = this._pending.get(message.id);
      if (resolve) {
        this._pending.delete(message.id);
        resolve(message.result);
      }
      return;
    }

    // Request (expects a response).
    if (message.id !== undefined) {
      const handlers = this.handlers.get(message.method) || [];
      const handler = handlers[0];
      let result = null;
      try {
        result = handler ? handler(message.params) : null;
      } catch (err) {
        this._write({
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32603, message: String((err && err.message) || err) },
        });
        return;
      }
      Promise.resolve(result).then(
        value => this._write({ jsonrpc: '2.0', id: message.id, result: value === undefined ? null : value }),
        err =>
          this._write({
            jsonrpc: '2.0',
            id: message.id,
            error: { code: -32603, message: String((err && err.message) || err) },
          })
      );
      return;
    }

    // Notification (no response).
    this._dispatch(message.method, message.params);
  }
}

module.exports = { Connection };
