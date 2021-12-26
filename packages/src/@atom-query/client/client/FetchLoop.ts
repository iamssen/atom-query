import { DedupedFetchTicket, FetchTicket } from '../models';

export function dedupeFetchTickets(queue: FetchTicket[]): DedupedFetchTicket[] {
  if (queue.length === 0) {
    throw new Error(`queue does not have any items`);
  }

  const [first, ...rest] = queue;

  const dedupedTickets: DedupedFetchTicket[] = [
    {
      ...first,
      callbacks: new Set([first.callback]),
    },
  ];

  // TODO improve grouping algorithm (currently - single task run: 100000 jobs = 171ms ~ 200ms)

  for (const ticket of rest) {
    const existsTickets = dedupedTickets.find(
      (tickets) =>
        ticket.key === tickets.key && tickets.params.isEqual(ticket.params),
    );

    if (existsTickets) {
      existsTickets.callbacks.add(ticket.callback);
    } else {
      dedupedTickets.push({
        ...ticket,
        callbacks: new Set([ticket.callback]),
      });
    }
  }

  return dedupedTickets;
}

export async function executeFetchTickets(
  dedupedFetchTickets: DedupedFetchTicket,
) {
  try {
    const value = await dedupedFetchTickets.fetch(
      ...dedupedFetchTickets.params.args,
    );

    for (const callback of dedupedFetchTickets.callbacks) {
      callback({
        succeed: true,
        value,
      });
    }
  } catch (error) {
    for (const callback of dedupedFetchTickets.callbacks) {
      callback({
        succeed: false,
        error,
      });
    }
  }
}

export function sampleMatchedTicketCallbacksIntoDedupedTickets(
  dedupedFetchTickets: DedupedFetchTicket[],
  fetchTickets: FetchTicket[],
) {
  for (const ticket of fetchTickets) {
    for (const dedupedTicket of dedupedFetchTickets) {
      if (
        dedupedTicket.key === ticket.key &&
        dedupedTicket.params.isEqual(ticket.params) &&
        !dedupedTicket.callbacks.has(ticket.callback)
      ) {
        dedupedTicket.callbacks.add(ticket.callback);
        break;
      }
    }
  }
}

interface Options {
  getSubscribingFetchTickets?: () => FetchTicket[];
  debug?: boolean;
}

export class FetchLoop {
  private queue: FetchTicket[] = [];

  private executed: boolean = false;

  static debug: {
    latestFetchTicketLength?: number;
    latestDedupedFetchTicketsLength?: number;
  } = {};

  constructor(private readonly options: Options = {}) {}

  get queueSize(): number {
    return this.queue.length;
  }

  add = (fetchTicket: FetchTicket) => {
    this.queue.push(fetchTicket);

    if (!this.executed) {
      setTimeout(this.executeFetch, 1);
      this.executed = true;
    }
  };

  private executeFetch = () => {
    if (this.queue.length === 0) {
      throw new Error(`queue does not have any items`);
    }

    this.executed = false;

    const dedupedFetchTickets = dedupeFetchTickets(this.queue);

    if (this.options.getSubscribingFetchTickets) {
      const subscriptionJobs = this.options.getSubscribingFetchTickets();

      sampleMatchedTicketCallbacksIntoDedupedTickets(
        dedupedFetchTickets,
        subscriptionJobs,
      );
    }

    if (this.options.debug === true) {
      FetchLoop.debug.latestFetchTicketLength = this.queue.length;
      FetchLoop.debug.latestDedupedFetchTicketsLength =
        dedupedFetchTickets.length;
    }

    this.queue = [];

    for (const executingTicket of dedupedFetchTickets) {
      executeFetchTickets(executingTicket);
    }
  };
}
