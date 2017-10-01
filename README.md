# Cro + React/Redux Single Page Application Sample

This is a sample application showing the use of a Cro backend together with a
React/Redux frontend written using ES6 (the latest JavaScript, compiled down
to the kind of JavaScript browsers understand). It uses both HTTP and web
sockets to communicate.

There is a [tutorial](http://cro.services/docs/intro/spa-with-cro) that walks
step by step through the creation of this application. To simply run the
application, first install Cro:

```
zef install --/test cro
```

And then, after cloning this repository, and changing into its directory, do:

```
zef install --depsonly .
npm install .
npm run build
cro run
```
