## Schema API Client for NodeJS

*Schema is the API-centric platform to build and scale ecommerce.*

Create an account at https://schema.io

## Usage example

	npm install schema-client

## Usage example

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

