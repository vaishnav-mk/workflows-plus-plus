// Stub for cloudflare:email - may not be available in all Workers
export class EmailMessage {
  constructor(from, to, message) {
    this.from = from;
    this.to = to;
    this.message = message;
  }
}

