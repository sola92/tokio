//@flow
/* eslint-disable no-constant-condition */
import AWS from "aws-sdk";
import type { Sqs$Client, Sqs$Response, Sqs$Message } from "aws-sdk";
const util = require("util");

const sqs: Sqs$Client = new AWS.SQS().client;

type Primitive = string | number | boolean | Json;
type QueueMessage = {
  call: string,
  params: Array<?Primitive>
};

type HandlerType = (...params: Array<Primitive>) => void;

export class InvalidProcessorError extends Error {}

const handleMessage = (target: Class<*>, message: QueueMessage) => {
  console.log("in handleMessage with message: " + util.inspect(message));
  if (typeof target[message.call] !== "function") {
    console.error(
      `Processor ${target.name} does not have handler: ${message.call}`
    );
    return;
  }
  const handler: HandlerType = target[message.call];
  // $FlowFixMe
  handler.call(target, ...message.params);
};

export const handler = function() {
  return (target: Class<*>, call: string, descriptor: any) => {
    console.log("in handler");
    if (typeof descriptor.value !== "function") {
      throw new InvalidProcessorError(
        `${target.name}.${call} cannot be a queue handler`
      );
    }

    const handler: HandlerType = descriptor.value;
    handler.publish = (...params: Array<?Primitive>): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const queueUrl: ?string = target.__queueUrl__;
        if (!queueUrl || queueUrl.trim().length === 0) {
          throw new InvalidProcessorError(
            `Unable to publish ${call}... Class ${target.name} is ` +
              `not a processor`
          );
        }

        const message: QueueMessage = {
          call,
          params
        };

        if (process.env.NODE_ENV != "production") {
          handleMessage(target, message);
          resolve(true);
          return;
        }

        sqs.sendMessage(
          {
            QueueUrl: queueUrl.trim(),
            MessageBody: JSON.stringify(message)
          },
          (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(true);
          }
        );
      });
    };
  };
};

export const processor = function(queueUrl: string) {
  console.log("in processor");
  const removeFromQueue = (message: Sqs$Message) => {
    sqs.deleteMessage(
      {
        QueueUrl: queueUrl,
        ReceiptHandle: message.ReceiptHandle
      },
      (err, data) => {
        err && console.error(err);
      }
    );
  };

  return (target: Class<*>) => {
    Object.assign(target, {
      __queueUrl__: queueUrl,
      consumeIndefinitely({
        waitTimeSeconds,
        visibilityTimeout,
        maxNumberOfMessages
      }: {
        waitTimeSeconds: number,
        visibilityTimeout: number,
        maxNumberOfMessages: number
      }) {
        if (this.consuming) {
          throw new InvalidProcessorError("Already consuming on this process");
        }

        if (process.env.NODE_ENV != "production") {
          return;
        }

        this.consuming = true;
        while (true) {
          const params = {
            QueueUrl: queueUrl,
            WaitTimeSeconds: waitTimeSeconds,
            VisibilityTimeout: visibilityTimeout,
            MaxNumberOfMessages: maxNumberOfMessages
          };

          sqs.receiveMessage(params, (err, data: ?Sqs$Response) => {
            if (err) {
              console.error(err, "sqs error");
              return;
            }

            if (data != null) {
              for (const message of data.Messages) {
                const call: QueueMessage = JSON.parse(message.Body);
                handleMessage(target, call);
                removeFromQueue(message);
              }
            }
          });
        }
      }
    });
  };
};
