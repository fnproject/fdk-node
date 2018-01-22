const { Readable } = require('stream');
const { Writable } = require('stream');

/**
 * MockStdOutput is a very simple mock that be used
 * to capture and test a value written to stdout or stderr
 */

class MockStdOutput extends Writable {
  constructor(writeCallback) {
    super(writeCallback);
    this.writeCallback = writeCallback;
  }

  _write(chunk, encoding, callback) {
    this.writeCallback(chunk, encoding, callback);
  }
}

/**
 * MockStdin is a very simple mock that will return
 * a specified string when read from.
 */

class MockStdin extends Readable {
  constructor(inputValue) {
    super();
    this.input = inputValue;
  }

  _read() {
    if (this.input) {
      const buf = Buffer.from(this.input, 'ascii');
      this.push(buf);
      this.input = null;
    } else {
      this.push(null);
    }
  }
}

/**
 * Simple fs mock that returns a string when a file is read.
 */
class MockFs {
  constructor(tapeTest, fileName, fileContents) {
    this.tape = tapeTest;
    this.fileName = fileName;
    this.fileContents = fileContents;
  }

  readFileSync(name) {
    this.tape.equals(name, this.fileName,"unexpected file read");
    return this.fileContents;
  }

}

module.exports.MockStdOutput = MockStdOutput;
module.exports.MockStdin = MockStdin;
module.exports.MockFs = MockFs;
