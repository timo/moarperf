# Rakudo Profiler Front-End

Moarperf is a tool that takes the output of the Rakudo Perl 6 profilers available on MoarVM and makes them viewable with a web browser.

Depending on whether you pass an "instrumented profiler" file (`.sql`) or a "heap snapshot file" (`.mvmheap`), you will get one or the other profiler frontend.

Running your perl6 program with `--profile=foo.sql` or `--profile=bar.mvmheap` will generate a file for you. Additionally, the `Telemetry` module that comes with Rakudo offers a `snap` sub that takes a `:heap` argument that lets you create heap snapshots at specific points in your program, rather than whenever the GC runs.

# Installing the Front-end

## AppImage

There is a version of moarperf for linux that is packaged as an AppImage, which is a single file that can be executed directly. It contains a full rakudo of its own and does not require any kind of installation. You can find it on [the "releases" page of the moarperf repo](https://github.com/timo/moarperf/releases/).

## Traditional Installation

The Perl 6/Raku part of the program has some dependencies that can be installed with `zef`. The command to do that is `zef install --depsonly .` - but if you want it a bit faster, you can `--/tests` to skip testing modules before installation.

The javascript portion of the program has - like any javascript application seems to, nowadays - a boatload of dependencies. That's why there's pre-built packages up on github that have the javascript portion already "compiled". You can find them on [the "releases" page of the moarperf repo](https://github.com/timo/moarperf/releases/) 

# Building the front-end javascript code from source

Start with a clone of the repository. There should be a `frontend` folder with a `package.json` file, which is what `npm` and friends work with. Change into the `frontend` folder and run `npm install .`, which will download a whole lot of javascript packages. There are often some errors or warnings, but they can mostly be ignored.

Finally, compile the frontend code with the command `npm run build`. After it outputs a colorful list of files with file sizes and such, but it's not exiting, the `webpack.config.js` may still have `watch: true` turned on, in which case the build script will keep running and check for changes you make to the source files to immediately recompile.


# Running the front-end

After installing the perl6/raku dependencies and either extracting the release tarball, or building the javascript code from source, you can run `perl6 -I . service.p6` in the root folder to start the program. That is where `META6.json` lives. By default it will offer a web interface on http://localhost:20000, but environment variables `MOARPERF_HOST` and `MOARPERF_PORT` can be used to change that. Passing a filename, either a `.sql`, a `.sqlite3`, or a `.mvmheap` file, will immediately load the data in question.

# More info

My blog on https://wakelift.de has a couple of posts that explain aspects of the program.

The program's development is funded by a grant from The Perl Foundation.
