# Coinbase Wallet SDK for native mobile apps

## Example data

### handshake
- URL
`https://go.cb-w.com/wsegue?p=eyJ2ZXJzaW9uIjoiMS4yLjMiLCJzZW5kZXIiOiI0UG9QTEFDUjNCb0VxWTJBdSthamRISGRSZStvU0ZaUVwvSkpDU091bHpTYz0iLCJjb250ZW50Ijp7ImhhbmRzaGFrZSI6eyJhcHBJZCI6ImNvbS5teWFwcC5wYWNrYWdlLmlkIiwiY2FsbGJhY2siOiJodHRwczpcL1wvbXlhcHAueHl6XC9uYXRpdmUtc2RrIiwiaW5pdGlhbEFjdGlvbnMiOlt7Im1ldGhvZCI6ImV0aF9zb21lTWV0aG9kIiwicGFyYW1zIjpbInBhcmFtMSIsInBhcmFtMiJdfV19fSwidXVpZCI6IjExMUYzRTI2LTE2N0YtNEJGNS1BQzM4LTZEOTNBNjU2RTMyQiJ9`
- JSON (decoded the URL above. handshake messages are not encrypted)
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
          "optional": false,
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
- URL
`https://go.cb-w.com/wsegue?p=eyJ2ZXJzaW9uIjoiMS4yLjMiLCJzZW5kZXIiOiJmbW5IZVh3OTNlY000QnFzSXpRTk5zb2FvS0ZxK3NOMHZRaWdvaVNQZ2dvPSIsImNvbnRlbnQiOnsicmVxdWVzdCI6eyJfMCI6IkdQYUwwTWJjbVhoVWU5eUprY0p5dnRJWVJUM3RXNEhcL1lBUmNKTXZGZlZWOWh6OXcya1h3YmxIMEJPcFN2UXI0RVhoV0FVUlwvZGFwWUVMZ2lvTkFXY3IxVlwvY1JoNDVUaFN2SFV1cHRlY0lJR0tLeGxKTWdwZ2RiMWNJRWhNWEdpVElBYkZTblJTOVlwOFowOHJcL3pkcjlBVytFQjRXSXBLcnhTTmVqQXRRTDJWTDByRWE2YzhvM0lodG5DQ1U1SzRpaVVZcTJkamd0eGRJZm1FbmhrTUFCQVwvSm5INFpBPT0ifX0sInV1aWQiOiJEMzg3MUYwRS03QkNFLTQxMjYtQjY1Ny05QjlGOEQ1NEU3N0YifQ%3D%3D`
- encrypted JSON (decoded from the URL above)
```json
{
  "version": "1.2.3",
  "sender": "oEC2AZndVwTcLs3ixQyxThlHrKBNdBczbWp9OjeglGY=",
  "content": {
    "request": {
      "data": "/LzMCiGCpiYuUHp2vdlQM4V+f7hYygKI2qhX/ZWuFA6/aqZ/bmnWhROK14vtBH3sbrROqfefMXue3rbqLOg1s+xzh6iXoVavhIeCSevugp1ZlERG9q+CSuLXyRR3tou6wdsJ60jOTDjGzLCvcHp2ykglfDUr2qaVRo3i/RXsJRoPrW9CurSM9+TmNZ46aq1Y/K8lBcpq1aFUYSn7+kHHR8xBY+QoPE0yox+dZrvSi7Z16fX3uwZ3NQPmhPqQXpDFEHrZeKEzoIZAPA8NUlrajgY/1mxhbkH9tmM8X5vSG7w="
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
          "optional": false,
          "params": [
            "param1",
            "param2"
          ]
        },
        {
          "method": "eth_someMethod2",
          "optional": true,
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

### response
- plain response JSON (to pass via RN <> native bridge)
```json
{
  "version": "7.13.1",
  "sender": "XDB/privdU+ixLKnMSjpgoeHZkoa6v+fRaF8ZS9/VFU=",
  "content": {
    "response": {
      "requestId": "0BEA47B9-12BF-477C-ADF0-FFA3D445A642",
      "values": [
        "result1",
        "result2"
      ]
    }
  },
  "uuid": "BAB3DCA9-F27B-420C-AC8B-E80C0D7D013B"
}
```
- encrypted JSON (encrypted the JSON object above)
```json
{
  "version": "7.13.1",
  "sender": "igdPSvLYYW+itJnSjE1WzVeEoxdIceZ46PTRKYzP4Do=",
  "content": {
    "response": {
      "requestId": "ED7C15A1-BB7A-48BF-990A-14E3A1156DF3",
      "data": "2sfm8MzgrNUUtVRK3Rc1sewPx7K4HwL+SoNkczkAyvzLvihzP17Em6RU3yjPTqOO5A=="
    }
  },
  "uuid": "B14E7554-90B0-48EC-BD7D-90EB0E7C0775"
}
```
- URL
`https://myapp.xyz/native-sdk?p=eyJ2ZXJzaW9uIjoiNy4xMy4xIiwic2VuZGVyIjoiWERCXC9wcml2ZFUraXhMS25NU2pwZ29lSFprb2E2ditmUmFGOFpTOVwvVkZVPSIsImNvbnRlbnQiOnsicmVzcG9uc2UiOnsicmVxdWVzdElkIjoiMEJFQTQ3QjktMTJCRi00NzdDLUFERjAtRkZBM0Q0NDVBNjQyIiwiXzEiOiJEbitVSWdlNGlPaW8xZmVZb1wvaFAwdHBsSkZCcEd2ZjVjMWR5UkdoZzFUNWdZREFcL1lvSTYyYWlTWkhHRmRCa0xPZz09In19LCJ1dWlkIjoiQkFCM0RDQTktRjI3Qi00MjBDLUFDOEItRTgwQzBEN0QwMTNCIn0%3D`

### error
- JSON (error messages are not encrypted)
```json
{
  "version": "7.13.1",
  "sender": "aCcPTQ3z9XjYLAtfOmD2YwJVWwbkWwxuyVfuSV+yNjc=",
  "content": {
    "error": {
      "requestId": "CC4A4AD2-3881-41E3-A80F-99A18BEB83D5",
      "description": "error message from host"
    }
  },
  "uuid": "14287B37-0F47-4104-8124-A388B9B70F81"
}
```
- URL
`https://myapp.xyz/native-sdk?p=eyJ2ZXJzaW9uIjoiNy4xMy4xIiwic2VuZGVyIjoiYUNjUFRRM3o5WGpZTEF0Zk9tRDJZd0pWV3dia1d3eHV5VmZ1U1YreU5qYz0iLCJjb250ZW50Ijp7ImVycm9yIjp7InJlcXVlc3RJZCI6IkNDNEE0QUQyLTM4ODEtNDFFMy1BODBGLTk5QTE4QkVCODNENSIsImRlc2NyaXB0aW9uIjoiZXJyb3IgbWVzc2FnZSBmcm9tIGhvc3QifX0sInV1aWQiOiIxNDI4N0IzNy0wRjQ3LTQxMDQtODEyNC1BMzg4QjlCNzBGODEifQ%3D%3D`
