#!/bin/bash

########################################################################
# Package the binaries built on Travis-CI as an AppImage
# By Simon Peter 2016
# For more information, see http://appimage.org/
########################################################################

set -xe

export ARCH="$(arch)"
export VERSION="v0.0.1"

APP=moarperf
LOWERAPP=$APP

mkdir -p "$HOME/$APP/$APP.AppDir/usr/"
BUILD_PATH="$(pwd)"

git clone https://github.com/rakudo/rakudo
cd rakudo
git checkout 2020.08.2
sudo perl Configure.pl --prefix="/usr/rakudo/" --gen-moar
sudo make -j2 install

cd ../

"/usr/rakudo/bin/raku" -e '(run ["tar", "--help"], :!out, :!err).so.say'

git clone https://github.com/ugexe/zef

cd zef

"/usr/rakudo/bin/raku" -I . bin/zef install .
cd $BUILD_PATH

"/usr/rakudo/bin/raku" "$HOME/.raku/bin/zef" install --/test \
    "JSON::Fast" \
    "OO::Monitors" \
    "Cro::HTTP" \
    "Cro::WebSocket" \
    "App::MoarVM::HeapAnalyzer" \
    "Digest::SHA1::Native" \
    "DBIish"

"/usr/rakudo/bin/raku" "$HOME/.raku/bin/zef" install .

cd "$HOME/$APP/appimage"

wget -q https://github.com/AppImage/pkg2appimage/releases/download/continuous/pkg2appimage-1788-x86_64.AppImage -O ./pkg2appimage.AppImage
chmod +x ./pkg2appimage.AppImage

mkdir -p ../out/
./pkg2appimage.AppImage ./MoarPerf.yml
cp MoarPerf.AppImage ../out/
