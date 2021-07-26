/*
 * Copyright (c) 2019, 2020 Oracle and/or its affiliates. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fdk = require('@fnproject/fdk')
const fs = require('fs')
/**
 * Sends a file to the output as a stream - this does not load the whole file into memory
 */
fdk.handle(function (input, ctx) {
  ctx.responseContentType = 'text/html'
  return fdk.streamResult(fs.createReadStream('testfile.html'))
})
