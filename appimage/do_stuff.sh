#!/bin/bash

########################################################################
# Package the binaries built on Travis-CI as an AppImage
# By Simon Peter 2016
# For more information, see http://appimage.org/
########################################################################

set -e

export ARCH="$(arch)"
export VERSION="v0.0.1"

APP=moarperf
LOWERAPP=$APP

mkdir -p "$HOME/$APP/$APP.AppDir/usr/"
BUILD_PATH="$(pwd)"

git clone https://github.com/rakudo/rakudo
cd rakudo
git checkout 2020.08.2
perl Configure.pl --prefix="$HOME/$APP/$APP.AppDir/usr/rakudo/install/" --gen-moar
make -j2 install

cd ../

git clone https://github.com/ugexe/zef

cd zef
"$HOME/$APP/$APP.AppDir/usr/rakudo/install/bin/raku" -I . bin/zef install .
cd $BUILD_PATH

"$HOME/$APP/$APP.AppDir/usr/rakudo/install/bin/zef" install --/test \
    "JSON::Fast" \
    "OO::Monitors" \
    "Cro::HTTP" \
    "Cro::WebSocket" \
    "App::MoarVM::HeapAnalyzer" \
    "Digest::SHA1::Native" \
    "DBIish"

"$HOME/$APP/$APP.AppDir/usr/rakudo/install/bin/zef" install .

cd "$HOME/$APP/"

wget -q https://github.com/probonopd/AppImages/raw/master/functions.sh -O ./functions.sh
. ./functions.sh

cd $APP.AppDir

cat >> AppRun <<"EOF"
#!/bin/sh
./install/bin/raku ./rakuapp/service.p6
EOF

mkdir rakuapp
cp    $BUILD_PATH/META6.json rakuapp
cp    $BUILD_PATH/service.p6 rakuapp
cp -r $BUILD_PATH/static rakuapp
cp -r $BUILD_PATH/lib rakuapp

########################################################################
# Copy desktop and icon file to AppDir for AppRun to pick them up
########################################################################

#cp "${BUILD_PATH}/appimage/${LOWERAPP}.desktop" .
#cp "${BUILD_PATH}/appimage/${LOWERAPP}.png" .

########################################################################
# Copy in the dependencies that cannot be assumed to be available
# on all target systems
########################################################################

copy_deps


########################################################################
# Patch away absolute paths; it would be nice if they were relative
########################################################################

find . -type f -exec sed -i -e 's|/usr|././|g' {} \;
find . -type f -exec sed -i -e 's@././/bin/env@/usr/bin/env@g' {} \;

########################################################################
# AppDir complete
# Now packaging it as an AppImage
########################################################################

cd .. # Go out of AppImage

mkdir -p ../out/
generate_type2_appimage
