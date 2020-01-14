#!/usr/bin/env bash
set -euo pipefail

# ========================================
# Build and run the end-to-end tests
# ========================================

# Flags:
# -p: Platform (android or ios)
# -v (Optional): Name of virual machine to run
# -f (Optional): Fast (skip build step)
# -r (Optional): Use release build (by default uses debug)

PLATFORM=""
VD_NAME="Nexus_5X_API_28_x86"
FAST=false
RELEASE=false
while getopts 'p:fr' flag; do
  case "${flag}" in
    p) PLATFORM="$OPTARG" ;;
    v) VD_NAME="$OPTARG" ;;
    f) FAST=true ;;
    r) RELEASE=true ;;
    *) error "Unexpected option ${flag}" ;;
  esac
done

[ -z "$PLATFORM" ] && echo "Need to set the PLATFORM via the -p flag" && exit 1;

# Ensure jest is accessible to detox
cp ../../node_modules/.bin/jest node_modules/.bin/

# Just to be safe kill any process that listens on the port 'yarn start' is going to use
echo "Killing previous metro server (if any)"
yarn react-native-kill-packager || echo "Failed to kill package manager, proceeding anyway"

# Build the app and run it
if [ $PLATFORM = "android" ]; then
  echo "Using platform android"

  if [ -z $ANDROID_SDK_ROOT ]; then
    echo "No Android SDK root set"
    exit 1
  fi

  if [[ ! $($ANDROID_SDK_ROOT/emulator/emulator -list-avds | grep ^$VD_NAME$) ]]; then
    echo "AVD $VD_NAME not installed. Please install it or change the detox configuration in package.json"
    echo "You can see the list of available installed devices with $ANDROID_SDK_ROOT/emulator/emulator -list-avds"
    exit 1
  fi

  if [ "$RELEASE" = false ]; then
    CONFIG_NAME="android.emu.debug"
  else
    CONFIG_NAME="android.emu.release"
  fi

  if [ "$FAST" = false ]; then
    echo "Configuring the app"
    ./scripts/run_app.sh -p $PLATFORM -b
  fi

  echo "Building detox"
  yarn detox build -c $CONFIG_NAME

  echo "Starting the metro server"
  yarn react-native start &

  NUM_DEVICES=`adb devices -l | wc -l`
  if [ $NUM_DEVICES -gt 2 ]; then 
    echo "Emulator already running or device attached. Please shutdown / remove first"
    exit 1
  fi

  echo "Starting the emulator"
  $ANDROID_SDK_ROOT/emulator/emulator -avd $VD_NAME -no-boot-anim &

  echo "Ran startup command"
  #TODO need this?
  # echo "Restarting the adb server"
  # adb kill-server && adb start-server
  #adb reverse tcp:8081 tcp:8081

  echo "Waiting for device to connect to Wifi, this is a good proxy the device is ready"
  until [ `adb shell dumpsys wifi | grep "mNetworkInfo" | grep "state: CONNECTED" | wc -l` -gt 0 ]
  do
    sleep 3 
  done

  #adb reverse tcp:8081 tcp:8081
  CELO_TEST_CONFIG=e2e yarn detox test -c $CONFIG_NAME -a e2e/tmp/ --take-screenshots=failing --record-logs=failing --detectOpenHandles -l verbose

elif [ $PLATFORM = "ios" ]; then
  echo "Using platform ios"
  echo "IOS e2e tests not currently supported"
  exit 1

else
  echo "Invalid value for platform, must be 'android' or 'ios'"
  exit 1
fi


echo "Done test, cleaning up"
yarn react-native-kill-packager

echo "Closing emulator (if active)"
#TODO doesn't work
kill -s 9 `ps -a | grep "$VD_NAME" | grep -v "grep"  | awk '{print $1}'`




#bash ./scripts/unlock.sh
# adb reconnect
# if [ $? -ne 0 ]
# then
#   exit 1
# fi

# echo "Waiting for emulator to unlock..."
# # TODO: improve this to actually poll if the screen is unlocked
# # https://stackoverflow.com/questions/35275828/is-there-a-way-to-check-if-android-device-screen-is-locked-via-adb
# sleep 3
# echo "Emulator unlocked!"

# # sometimes the emulator locks itself after boot
# # this prevents that
# bash ./scripts/unlock.sh




# yarn test:detox
# STATUS=$?

#  # Retry on fail logic
# if [ $STATUS -ne 0 ]; then
#    echo "It failed once, let's try again"
#    yarn test:detox
#    STATUS=$?
# fi

# if [ $STATUS -ne 0 ]; then
#    # TODO: upload e2e_run.log and attach the link
#    echo "Test failed"
# else
#    echo "Test passed"
# fi


# echo "Closing emulator"
# kill -s 9 `ps -a | grep "Nexus_5X_API_28_x86" | grep -v "grep"  | awk '{print $1}'`

# echo "Closing pidcat"
# kill -s 9 `ps -a | grep "pidcat" | grep -v "grep"  | awk '{print $1}'`

# exit $STATUS
