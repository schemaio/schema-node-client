## Schema API Client for NodeJS

Build and scale ecommerce with Schema. Create a free account at https://schema.io

## Install

	npm install schema-client

## Example

	var Schema = require('schema-client');

	var client = new Schema.Client('client_id', 'client_key');

	client.get('/categories/shoes/products', {color: 'blue'}, function(products) {
		console.log(products);
	});

## Documentation

See <http://schema.io/docs/clients#node> for more API docs and usage examples

## Contributing

Pull requests are welcome

## License

MIT

