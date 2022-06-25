# Coinbase Wallet SDK for native mobile apps

## Example data

### handshake
`https://go.cb-w.com/wsegue?p=eyJ2ZXJzaW9uIjoiMS4yLjMiLCJzZW5kZXIiOiI0UG9QTEFDUjNCb0VxWTJBdSthamRISGRSZStvU0ZaUVwvSkpDU091bHpTYz0iLCJjb250ZW50Ijp7ImhhbmRzaGFrZSI6eyJhcHBJZCI6ImNvbS5teWFwcC5wYWNrYWdlLmlkIiwiY2FsbGJhY2siOiJodHRwczpcL1wvbXlhcHAueHl6XC9uYXRpdmUtc2RrIiwiaW5pdGlhbEFjdGlvbnMiOlt7Im1ldGhvZCI6ImV0aF9zb21lTWV0aG9kIiwicGFyYW1zIjpbInBhcmFtMSIsInBhcmFtMiJdfV19fSwidXVpZCI6IjExMUYzRTI2LTE2N0YtNEJGNS1BQzM4LTZEOTNBNjU2RTMyQiJ9`
```json
{
  "version": "1.2.3",
  "sender": "6qyKihWKHU6pL3A/dzjo5Lq8cbKOuoJbBR/7k918vCg=",
  "content": {
    "handshake": {
      "appId": "com.myapp.package.id",
      "callback": "https://myapp.xyz/native-sdk",
      "initialActions": [
        {
          "method": "eth_someMethod",
          "params": [
            "param1",
            "param2"
          ]
        }
      ]
    }
  },
  "uuid": "249CCFBA-5D94-4564-8D6F-7BB54D73CDB9"
}
```

### request
`https://go.cb-w.com/wsegue?p=eyJ2ZXJzaW9uIjoiMS4yLjMiLCJzZW5kZXIiOiJmbW5IZVh3OTNlY000QnFzSXpRTk5zb2FvS0ZxK3NOMHZRaWdvaVNQZ2dvPSIsImNvbnRlbnQiOnsicmVxdWVzdCI6eyJfMCI6IkdQYUwwTWJjbVhoVWU5eUprY0p5dnRJWVJUM3RXNEhcL1lBUmNKTXZGZlZWOWh6OXcya1h3YmxIMEJPcFN2UXI0RVhoV0FVUlwvZGFwWUVMZ2lvTkFXY3IxVlwvY1JoNDVUaFN2SFV1cHRlY0lJR0tLeGxKTWdwZ2RiMWNJRWhNWEdpVElBYkZTblJTOVlwOFowOHJcL3pkcjlBVytFQjRXSXBLcnhTTmVqQXRRTDJWTDByRWE2YzhvM0lodG5DQ1U1SzRpaVVZcTJkamd0eGRJZm1FbmhrTUFCQVwvSm5INFpBPT0ifX0sInV1aWQiOiJEMzg3MUYwRS03QkNFLTQxMjYtQjY1Ny05QjlGOEQ1NEU3N0YifQ%3D%3D`
- encrypted JSON (decoded from the URL above)
```json
{
  "version": "1.2.3",
  "sender": "oEC2AZndVwTcLs3ixQyxThlHrKBNdBczbWp9OjeglGY=",
  "content": {
    "request": {
      "_0": "/LzMCiGCpiYuUHp2vdlQM4V+f7hYygKI2qhX/ZWuFA6/aqZ/bmnWhROK14vtBH3sbrROqfefMXue3rbqLOg1s+xzh6iXoVavhIeCSevugp1ZlERG9q+CSuLXyRR3tou6wdsJ60jOTDjGzLCvcHp2ykglfDUr2qaVRo3i/RXsJRoPrW9CurSM9+TmNZ46aq1Y/K8lBcpq1aFUYSn7+kHHR8xBY+QoPE0yox+dZrvSi7Z16fX3uwZ3NQPmhPqQXpDFEHrZeKEzoIZAPA8NUlrajgY/1mxhbkH9tmM8X5vSG7w="
    }
  },
  "uuid": "3E445386-8CB3-4995-99EC-DCF06A60081C"
}
```
- decrypted JSON (to pass via RN <> native bridge)
```json
{
  "version": "1.2.3",
  "sender": "qSAE/fvQ1cnZvVnKDjiHRyzK6bVQ/qJ7W29DL2aMjns=",
  "content": {
    "request": {
      "actions": [
        {
          "method": "eth_someMethod",
          "params": [
            "param1",
            "param2"
          ]
        },
        {
          "method": "eth_someMethod2",
          "params": [
            "param1",
            "param2"
          ]
        }
      ],
      "account": {
        "chain": "eth",
        "networkId": 17,
        "address": "0x12345678ABCD"
      }
    }
  },
  "uuid": "853BFBB5-A6F1-4FBA-B8C6-DC2BE3CCF6DF"
}
```
