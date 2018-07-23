FROM node:6.9.5

# see update.sh for why all "apt-get install"s have to stay as one long line
RUN apt-get update \
    && apt-get install -y cron supervisor --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/log/supervisor

ENV appDir /root
WORKDIR ${appDir}

COPY package.json ${appDir}
RUN npm install

COPY docker-config/docker-entrypoint.sh /
COPY docker-config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker-config/job.sh ${appDir}/
COPY docker-config/cron_fdls /etc/cron.d/

RUN touch /var/log/cron.log

COPY . ${appDir}

ENTRYPOINT ["/docker-entrypoint.sh"]

CMD ["/usr/bin/supervisord"]
