use v6.d.PREVIEW;

use Cro::HTTP::Log::File;
use Cro::HTTP::Server;
use Routes;
use HeapAnalyzerWeb;
use ProfilerWeb;

my $heapanalyzer = HeapAnalyzerWeb.new;
my $profiler = ProfilerWeb.new;
my $application = routes($heapanalyzer, $profiler);

my Cro::Service $http = Cro::HTTP::Server.new(
    http => <1.1>,
    host => %*ENV<MOARPERF_HOST> ||
        die("Missing MOARPERF_HOST in environment"),
    port => %*ENV<MOARPERF_PORT> ||
        die("Missing MOARPERF_PORT in environment"),
    :$application,
    after => [
        Cro::HTTP::Log::File.new(logs => $*OUT, errors => $*ERR)
    ]
);
$http.start;
say "Listening at http://%*ENV<MOARPERF_HOST>:%*ENV<MOARPERF_PORT>";

CONTROL {
    .perl.say;
}

react {
    whenever signal(SIGINT) {
        say "Shutting down...";
        $http.stop;
        done;
    }
}
