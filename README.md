# Rakudo Profiler Front-End

Moarperf is a tool that takes the output of the Rakudo perl 6 profilers available on MoarVM and makes them viewable with a web browser.

Currently, only the instrumented profiler, which is the default one you get when you run a program with the `--profile` flag. It is important to pass a `--profile-filename` that ends in `.sql`.

# Installing and Running the Front-end

You can install all dependencies of moarperf using zef. From inside a `git clone` or extracted archive of moarperf you can call `zef install --depsonly .`.

Some tests might not run right. That's probably not a big problem. If it keeps you from progressing, you can additionally pass `--/test` to zef.

The next step is to build and bundle all the javascript stuff. For that, first install the dependencies to your local `node_modules` using, for example, `npm install .`. Then to actually throw the code bundles together, run `npm run build`. It will start a watcher that immediately recompiles stuff whenever the sources change. That's good for development, but not for usage. You can just ctrl-c it after it spat out its summary of files generated.

After that, you can run `perl6 -I lib service.p6` to start the program. By default it will open a web interface on http://localhost:20000, but environment variables can be used to change that. Passing a filename, either a `.sql` or a `.sqlite3` file, will immediately load the profile data in question.

# More info

My blog on https://wakelift.de has a couple of posts that explain aspects of the program.

The program's development is funded by a grant from The Perl Foundation.
