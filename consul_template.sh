#!/bin/sh
### BEGIN INIT INFO
# Provides:           consul-template
# Required-Start:     $syslog $remote_fs
# Required-Stop:      $syslog $remote_fs
# Should-Start:       $local_fs
# Should-Stop:        $local_fs
# Default-Start:      2 3 4 5
# Default-Stop:       0 1 6
# Short-Description:  Consul Template queries Consul
# Description:        Consul Template queries a Consul instance.
### END INIT INFO


PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
DAEMON=/usr/local/bin/consul-template
DAEMON_ARGS=/etc/consul-template/consul-template.conf
NAME=consul-template
DESC=consul-template

PIDFILE=/var/run/consul-template.pid
CONFDIR=/etc/consul-template/conf.d

LOGFILE=/var/log/consul-template.log



case "$1" in
    start)
        echo -n "Starting $DESC: "
        if start-stop-daemon --start --background --pidfile $PIDFILE --exec $DAEMON  --make-pidfile -- -config=$CONFDIR >> $LOGFILE 2>&1
        then
            echo "$NAME."
	      else
		        echo "failed"
        fi
        ;;
    stop)
        echo -n "Stopping $DESC: "
        if start-stop-daemon --stop --retry 10 --quiet --oknodo --pidfile $PIDFILE  --exec $DAEMON
        then
            echo "$NAME."
        else
            echo "failed"
        fi
        rm -f $PIDFILE
        ;;
    restart|force-reload)
      	${0} stop
      	${0} start
      	;;
    status)
        echo -n "$DESC is "
        if start-stop-daemon --stop --quiet --signal 0 --name ${NAME} --pidfile ${PIDFILE}
        then
          echo "running"
        else
          echo "not running"
          exit 1
        fi
        ;;
    *)
        echo $"Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac

exit $?
