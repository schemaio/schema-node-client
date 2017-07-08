## Schema API Client for NodeJS [![Build Status](https://travis-ci.org/schemaio/schema-node-client.png?branch=master)](https://travis-ci.org/schemaio/schema-node-client)

Build and scale ecommerce with Schema. Create your account at <https://schema.io>

## Install

    npm install schema-client

## Connect

```javascript
const Schema = require('schema-client');

const client = new Schema.Client('<client-id>', '<client-key>');
```

## Usage

```javascript
client.get('/products', { active: true }).then(products => {
  console.log(products);
}).catch(err => {
  // handle error
});
```

## Caching

As of v3, this client provides in-memory caching enabled by default. It uses a version clocking protocol that means you never have to worry about stale cache, and collections that don't change frequently, such as products, will always return from cache when possible.

To disable caching behavior, initialize the client with `cache: false`.

```javascript
new Schema.Client('<client-id>', '<client-key>', {
  cache: false,
});
```

## Documentation

See <https://schema.io/docs> for more API docs and usage examples

## Contributing

Pull requests are welcome

## License

MIT
