//@flow
import "jest";
import { handler, processor, InvalidProcessorError } from "../processing";

jest.mock("aws-sdk");

test("that Processor.consumeIndefinitely() is attached to queue processors", async () => {
  @processor("transaction_queue")
  class TestProcessor {}

  // $FlowFixMe
  expect(TestProcessor.consumeIndefinitely).toBeDefined();
  // $FlowFixMe
  expect(typeof TestProcessor.consumeIndefinitely).toBe("function");
  // $FlowFixMe
  expect(TestProcessor.__queueUrl__).toBe("transaction_queue");
});

test("queue handlers have .publish() methods attached", async () => {
  @processor("transaction_queue")
  class TestProcessor {
    @handler()
    static testHandler() {}
  }

  // $FlowFixMe
  expect(TestProcessor.testHandler.publish).toBeDefined();
  // $FlowFixMe
  expect(typeof TestProcessor.testHandler.publish).toBe("function");
});

test(".publish() calls calls handler with args", async () => {
  const mock = jest.fn();
  const params = [1, null, true, { foo: { bar: "val" } }];
  @processor("transaction_queue")
  class TestProcessor {
    @handler()
    static testHandler(...args) {
      mock(args);
    }
  }

  // $FlowFixMe
  TestProcessor.testHandler.publish(...params);
  expect(mock).toBeCalledWith(params);
});

test("throws when handler attached to class that is not a processor", async () => {
  class TestProcessor {
    @handler()
    static testHandler(...args) {}
  }

  // $FlowFixMe
  expect(TestProcessor.testHandler.publish(1)).rejects.toThrow(
    InvalidProcessorError
  );
});
