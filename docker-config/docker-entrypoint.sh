#!/bin/bash
set -e

# not working
# if [ "$1" = 'cron' ]; then
#   ln -sfT /dev/stdout /var/log/cron.log
# fi

# export to file for cron task
printenv | xargs printf "export %s\n" > ~/.cronenv

exec "$@"
