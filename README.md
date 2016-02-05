## Schema API Client for NodeJS [![Build Status](https://travis-ci.org/schemaio/schema-node-client.png?branch=master)](https://travis-ci.org/schemaio/schema-node-client)

Build and scale ecommerce with Schema. Create a free account at <https://schema.io>

## Install

	npm install schema-client

## Connect

```javascript
var Schema = require('schema-client');

var client = new Schema.Client('<client-id>', '<client-key>');
```

## Usage

```javascript
client.get('/products', {active: true}, function(err, products) {
	if (err) {
		// handle error
		return;
	}
	console.log(products);
});
```

#### With promises

```javascript
client.get('/products', {active: true}).then(function(products) {
	console.log(products);
}).catch(function(err) {
	// handle error
});
```

## Documentation

See <https://schema.io/docs> for more API docs and usage examples

## Contributing

Pull requests are welcome

## License

MIT

