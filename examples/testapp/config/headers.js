function getCrossOriginOpenerPolicyHeaders() {
    return {
        source: "/",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin", 
            },
        ]
    }
}

// To test these headers in your local environment, 
// create a next.config and add the following rules to the next.config.js headers property.
module.exports = {
    getCrossOriginOpenerPolicyHeaders
}
