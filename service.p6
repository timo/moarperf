use v6.d.PREVIEW;

use Cro::HTTP::Log::File;
use Cro::HTTP::Server;
use Routes;
use HeapAnalyzerWeb;
use ProfilerWeb;

with @*ARGS {
    if @*ARGS > 0 and (@*ARGS[0] eq "-h" or @*ARGS[0] eq "--help") {
        print q:to/CAMELIA/;
                 ⣀⣴⣶⣿⣿⣿⣷⣶⣤⡀
               ⢀⣼⣿⠟⠋⠁⠀⣀⡀⠈⠻⣿⣦⡀
               ⣾⣿⠁⠀⣤⡶⠛⠉⠛⢷⡄⠈⣿⣿⡄
              ⢸⣿⣿⠀⠀⣿⠀⢠⣶⡄⠘⡿⠀⢸⡿⣿⡄
              ⢸⣿⣿⡀⠀⢸⣦⣘⠛⣃⠜⠁⢠⣿⣷⠘⡇
              ⠘⣿⣿⣧⠀⠀⠛⠉⠉⠀⢀⣴⣿⣿⠇⢠⡇ ⡀         ⢀⣀⣀
               ⠹⣿⣿⣷⡀⠀⠐⣾⣟⠿⠟⠛⢁⣠⣿⠇⠚⡟ ⢀⡄  ⣠⣴⣾⣿⣿⠿⢿⣿⣿⣶⣄⡀
                ⠙⣿⣿⣿⣦⡀⠈⢿⣿⣿⣿⣿⣿⠏ ⢠⠇⡴⠋⠃⣰⣿⡿⠋⠁⠀⠀⠀⠀⠀⠈⠙⠻⣿⣄
                 ⣈⣛⣿⣿⣿⣦⣈⡟⢉⣈⡉⢣⣄⣠⠏⣰⠃ ⣼⣿⠋⠀⢀⣤⣶⡄⠈⠻⣿⣷⣦⡄⠈⢻⡆
              ⣠⣾⣿⣿⣿⣿⣿⣿⣿⣿⡀⢺⣿⡗⢸⠇⠀⠉⠳⣄⣰⣿⡟⠀⢰⠏⢉⡉⠹⡄⠀⠹⣝⠻⣿⡀⠈⣿
            ⢀⣾⣿⡿⠛⠉⠉⠉⠙⢿⣿⡏⠳⢤⣤⠴⠋⠀⠀⢠⠎⢁⣤⡙⢧⠀⢸⠰⣿⡿⠀⣷⠀⠀⣿⡇⠹⣧⣼⣿
            ⣾⣿⡟⠀⠀⣠⣶⣿⣶⠀⢿⡇⠀⠀⢀⠀⠀⠀⠀⢸⠀⢿⣿⠇⣸⡀⠘⠷⠤⣴⣾⠟⠀⢰⣿⡏⠀⣿⣿⠇
            ⣿⣿⡅⠀⠀⢿⣿⡿⠛⠀⣿⣷⡀⠀⠹⡄⠀⠀⡀⠈⠳⠤⡤⣴⣿⣷⣤⣀⡀⠀⠀⠀⣰⣿⠟⠁⣼⡿⠋
            ⠹⣿⣷⣀⠀⠀⠀⠀⣠⣾⣿⣿⣿⢦⡀⠙⠳⠶⠋⠀⠀⠀⣰⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣶⣶⠿⠋
             ⠙⢿⣿⣿⣶⣾⣿⣿⣿⣿⠟⠁⡞⠈⡷⠲⢤⣤⣤⣶⠟⠛⠉⠛⢿⣿⣿⣿⡉⠉⠉⠉⠉
               ⠈⠉⠛⠛⠛⠋⠉   ⠇ ⡇ ⣿⣿⣿⠏⢰⣿⣷⡄⠀⠹⣿⣿⣧
                           ⠁ ⣿⣿⣿⠀⠘⣿⣿⡇⠀⠀⣿⣿⣿
                             ⠸⣿⣿⣇⠀⠈⠉⠁⠀⢀⣿⣿⡿
                              ⠙⢿⣿⣷⣄⣀⣀⣤⣾⣿⡿⠁
                                ⠙⠻⢿⣿⣿⣿⠿⠋
            CAMELIA
        print q:to/ABOUT/;
            MoarPerf performance analyzer for MoarVM's heap snapshots and profiler sql files
            Pass a filename to this script or select the file from the web interface.
            See the README at https://github.com/timo/moarperf for more information.
            ABOUT
        exit;
    }
}

my $heapanalyzer = HeapAnalyzerWeb.new;
my $profiler = ProfilerWeb.new;
my $application = routes($heapanalyzer, $profiler, @*ARGS[0]);

without @*ARGS[0] {
    note "please feel free to pass a filename to service.p6 to open a file immediately."
}

%*ENV<MOARPERF_HOST> //= do {
    note "environment variable MOARPERF_HOST not set. Defaulting to 'localhost'";
    "localhost";
}

%*ENV<MOARPERF_PORT> //= do {
    note "environment variable MOARPERF_PORT not set. Defaulting to '20000'";
    20000;
}

my Cro::Service $http = Cro::HTTP::Server.new(
    http => <1.1>,
    host => %*ENV<MOARPERF_HOST>,
    port => %*ENV<MOARPERF_PORT>,
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
