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
const identity = require('oci-identity')
const common = require('oci-common')

/**
 * This handler tests backward compatibility by ensuring that
 * existing functions with non-FDK dependencies (OCI SDK in this case)
 * continue to work correctly on the latest Code-Only Function runtime images.
 *
 * It also validates response and protocol compatibility by returning a
 * stable JSON response and a custom HTTP header, ensuring consistent
 * response formatting and headers across FDK and runtime updates.
 */

fdk.handle(async function (input, ctx) {
  const compartmentId = input.compartmentId
  let res = ''

  const authenticationProvider =
      await common.ResourcePrincipalAuthenticationDetailsProvider.builder()

  try {
    const identityClient = new identity.IdentityClient({
      authenticationDetailsProvider: authenticationProvider
    })

    const compartmentRequest = { compartmentId }
    const response = await identityClient.getCompartment(compartmentRequest)
    res = response.compartment.id
  } catch (e) {
    res = `Exception in sending request to identity client for compartmentId ${compartmentId} : ${e}`
  }

  // Add custom response header for protocol / backward compatibility validation
  ctx.responseContentType = 'application/json'
  ctx.setResponseHeader('X-Custom-Header', 'CustomHeaderValue')

  return { compartmentId: res }
})
