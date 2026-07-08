import type { Response } from 'express';
import type { ContractRealtimeEvent } from '../contracts/contracts.types.js';
import type { ContractRealtimeBroadcaster } from '../contracts/contracts.audit.js';

type Subscriber = {
  organisationId: string;
  response: Response;
  heartbeat: NodeJS.Timeout;
};

class ContractSseBroadcaster implements ContractRealtimeBroadcaster {
  private readonly subscribers = new Set<Subscriber>();

  publish(event: ContractRealtimeEvent): void {
    for (const subscriber of this.subscribers) {
      if (subscriber.organisationId !== event.organisation_id) {
        continue;
      }

      try {
        subscriber.response.write(`event: ${event.event_name}\n`);
        subscriber.response.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {
        this.removeSubscriber(subscriber);
      }
    }
  }

  subscribe(response: Response, organisationId: string): void {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();
    response.write(': connected\n\n');

    const subscriber: Subscriber = {
      organisationId,
      response,
      heartbeat: setInterval(() => {
        try {
          response.write(': heartbeat\n\n');
        } catch {
          this.removeSubscriber(subscriber);
        }
      }, 25_000),
    };

    this.subscribers.add(subscriber);

    const cleanup = () => {
      this.removeSubscriber(subscriber);
    };

    response.on('close', cleanup);
    response.on('error', cleanup);
  }

  private removeSubscriber(subscriber: Subscriber): void {
    if (!this.subscribers.has(subscriber)) {
      return;
    }

    clearInterval(subscriber.heartbeat);
    this.subscribers.delete(subscriber);

    if (!subscriber.response.writableEnded) {
      subscriber.response.end();
    }
  }
}

export const contractRealtimeBroadcaster = new ContractSseBroadcaster();

