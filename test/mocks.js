const {Readable, Writable} = require('stream')

/**
 * MockStdOutput is a very simple mock that be used
 * to capture and test a value written to stdout or stderr
 */

class MockStdOutput extends Writable {
  constructor (writeCallback) {
    super()
    this.writeCallback = writeCallback
  }

  _write (chunk, encoding, done) {
    this.writeCallback(chunk.toString(), encoding)
  }
}

/**
 * MockStdin is a very simple mock that will return
 * a specified string when read from.
 */

class MockStdin extends Readable {
  constructor (inputValue) {
    super()
    this.input = inputValue
  }

  _read () {
    if (this.input) {
      const buf = Buffer.from(this.input, 'ascii')
      this.push(buf)
      this.input = null
    } else {
      this.push(null)
    }
  }
}

/**
 * Simple fs mock that returns a string when a file is read.
 */
class MockFs {
  constructor (tapeTest, fileName, fileContents) {
    this.tape = tapeTest
    this.fileName = fileName
    this.fileContents = fileContents
  }

  readFileSync (name) {
    if (name === this.fileName) {
      return this.fileContents
    } else {
      this.tape.fail('Unexepected file read request: ' + name)
    }
  }
}

module.exports.MockStdOutput = MockStdOutput
module.exports.MockStdin = MockStdin
module.exports.MockFs = MockFs
