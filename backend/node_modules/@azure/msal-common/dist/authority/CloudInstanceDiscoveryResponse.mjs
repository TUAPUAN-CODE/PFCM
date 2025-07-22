/*! @azure/msal-common v15.0.1 2025-01-15 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function isCloudInstanceDiscoveryResponse(response) {
    return (response.hasOwnProperty("tenant_discovery_endpoint") &&
        response.hasOwnProperty("metadata"));
}

export { isCloudInstanceDiscoveryResponse };
//# sourceMappingURL=CloudInstanceDiscoveryResponse.mjs.map
