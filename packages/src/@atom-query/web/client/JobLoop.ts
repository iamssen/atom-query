import { Job, JobCallback } from '../models';

export type JobGroup = Omit<Job, 'callback'> & {
  callbacks: Set<JobCallback<any>>;
};

export function dedupeJobs(queue: Job[]): JobGroup[] {
  if (queue.length === 0) {
    throw new Error(`queue does not have any items`);
  }

  const [firstJob, ...restJobs] = queue;

  const jobGroups: JobGroup[] = [
    {
      ...firstJob,
      callbacks: new Set([firstJob.callback]),
    },
  ];

  // TODO improve grouping algorithm (currently - single task run: 100000 jobs = 171ms ~ 200ms)

  for (const job of restJobs) {
    const existsJobGroup = jobGroups.find(
      (jobs) => job.key === jobs.key && jobs.params.isEqual(job.params),
    );

    if (existsJobGroup) {
      existsJobGroup.callbacks.add(job.callback);
    } else {
      jobGroups.push({
        ...job,
        callbacks: new Set([job.callback]),
      });
    }
  }

  return jobGroups;
}

export async function executeJobGroup(jobGroup: JobGroup) {
  try {
    const value = await jobGroup.fetch(...jobGroup.params.args);

    for (const callback of jobGroup.callbacks) {
      callback({
        succeed: true,
        value,
      });
    }
  } catch (error) {
    for (const callback of jobGroup.callbacks) {
      callback({
        succeed: false,
        error,
      });
    }
  }
}

export function addJobCallbacks(jobGroups: JobGroup[], jobs: Job[]) {
  for (const job of jobs) {
    for (const jobGroup of jobGroups) {
      if (
        jobGroup.key === job.key &&
        jobGroup.params.isEqual(job.params) &&
        !jobGroup.callbacks.has(job.callback)
      ) {
        jobGroup.callbacks.add(job.callback);
        break;
      }
    }
  }
}

interface Options {
  getSubscriptionJobs?: () => Job[];
  debug?: boolean;
}

export class JobLoop {
  private queue: Job[] = [];

  private executed: boolean = false;

  static debug: {
    executionCount: number;
    latestJobsLength?: number;
    latestDedupedJobsLength?: number;
  } = {
    executionCount: 0,
  };

  constructor(private readonly options: Options = {}) {}

  get queueSize(): number {
    return this.queue.length;
  }

  add = (job: Job) => {
    this.queue.push(job);

    if (!this.executed) {
      setTimeout(this.execute, 1);
      this.executed = true;
    }
  };

  private execute = () => {
    if (this.queue.length === 0) {
      throw new Error(`queue does not have any items`);
    }

    this.executed = false;

    const dedupedJobs = dedupeJobs(this.queue);

    if (this.options.getSubscriptionJobs) {
      const subscriptionJobs = this.options.getSubscriptionJobs();
      addJobCallbacks(dedupedJobs, subscriptionJobs);
    }

    if (this.options.debug === true) {
      JobLoop.debug.executionCount += 1;
      JobLoop.debug.latestJobsLength = this.queue.length;
      JobLoop.debug.latestDedupedJobsLength = dedupedJobs.length;
    }

    this.queue = [];

    for (const dedupedJob of dedupedJobs) {
      executeJobGroup(dedupedJob);
    }
  };
}
