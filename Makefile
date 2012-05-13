MOCHA = ./node_modules/.bin/mocha --reporter spec
NODE = node

test:
	@${MOCHA} test/specs.js

benchmark:
	@${NODE} test/benchmarks.js

.PHONY: test
