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

function asyncFunction (x, y) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve(x + y), 100)
  })
}

/**
 *  Handlers work fine with async functions or any function that returns a promise
 */
fdk.handle(async function (input, ctx) {
  const val = await asyncFunction(1, 2)

  return asyncFunction(val, 3)
})
