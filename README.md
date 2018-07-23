WL_CONSUL
=========

This tool check new skin from fidelisa API then update consul services "WL"

Environements variables
-----------------------
Create a file `.env` with:
* PROVIDER: Provider ID for Fidelisa
* PROVIDER_KEY: Provider Key for Fidelisa
* CONSUL_URL: Consul url
* FIDELISA_URL: Fidelisa Url  
* TARGET_DOMAIN : domain host
* OVH_KEY : ovh key
* OVH_SECRET : ovh secret
* OVH_CONSUMER : ovh consumer


Install
-------
Install libraries
```shell
$ npm install
```

Usage
-----
Perform wl registration (once), you can make a cron to check every minutes...
```shell
$ npm start
```

Rendering template (wl.ctmpl)
```shell
$ consul-template  -template="./wl.ctmpl:wl.conf"
```

Docker run example
```shell
$ docker run -ti --env-file myenv --link "consul_consul_1:consul"  --network "consul_default"  fidelisa/wl_consul
```
