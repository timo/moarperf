
use OO::Monitors;

unit monitor CodeRunner;

method get-interesting-local-files(Str :$type) {
    given $type {
        when "script" {
            dir(test => /\.[p6|pm|pm6]/)>>.basename
        }
        when "profiles" {
            dir(test => /[^"heap-snapshot-" | '.sql'$ | '.sqlite3'$]/)>>.basename;
        }
    }
}

# One to write code to a temp file
multi method run-program-with-profiler(Str :$code!) {

}

multi method run-program-with-profiler(Str :$filename!) {

}
