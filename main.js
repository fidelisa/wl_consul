'use strict';

var
  request = require('request'),
  winston= require('winston');

require('dotenv').config();

var ovh = require('ovh')({
  appKey: process.env.OVH_KEY,
  appSecret: process.env.OVH_SECRET,
  consumerKey: process.env.OVH_CONSUMER
});

var targetDomain = process.env.TARGET_DOMAIN;

var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .alias('c', 'clean')
  .describe('c', 'clean registered before registration')
  .boolean('dry')
  .describe('dry', 'dry run do nothing')
  .help('h')
  .alias('h', 'help')
  .epilog('copyright 2017')
  .argv;

function putService(id, name) {
  winston.log('info', 'Put service '+id);

  if (argv.dry) {
    return Promise.resolve(true);
  }


  return new Promise(function(resolve, reject) {
    var postData = {
      'ID': id,
      'Name': name
    };

    request({
      method: 'PUT',
      uri: process.env.CONSUL_URL+'/v1/agent/service/register',
      json: true,
      body: postData
    }, function (error, response) {
      if ( error || response.statusCode !== 200 ) {
        reject('error', response.statusMessage);
      } else {
        resolve(true);
      }
    });
  });
}

function getServices(with_ext) {
  winston.log('info','Get services');
  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: process.env.CONSUL_URL+'/v1/agent/services',
      json: true,
    }, function (error, response, body) {
      if ( error || response.statusCode !== 200 ) {
        reject(error || response.statusMessage);
      } else {
        var ret = [];
        for(var myKey in body) {
          var element = body[myKey];
          if (element.Service === 'wl') {
            ret.push(element);
          } else if (with_ext && element.Service === 'wl_ext') {
            ret.push(element);
          }
        }
        resolve(ret);
      }
    });
  });

}

function rmServices(service) {
  winston.log('info','Remove service' + service);

  if (argv.dry) {
    return Promise.resolve(true);
  }

  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: process.env.CONSUL_URL+'/v1/agent/service/deregister/'+service,
      json: true,
    }, function (error, response) {
      if ( error || response.statusCode !== 200 ) {
        reject('error', response.statusMessage);
      } else {
        resolve(service);
      }
    });
  });
}

function getSkins() {
  winston.log('info','Get skins');
  return new Promise(function(resolve, reject) {
    request({
      method: 'GET',
      uri: process.env.FIDELISA_URL+'/api/skins',
      json: true,
      headers: {
        'FIDELISA_PROVIDER': process.env.PROVIDER,
        'FIDELISA_PROVIDER_KEY': process.env.PROVIDER_KEY
      }
    }, function (error, response, body) {
      if ( error || response.statusCode !== 200 ) {
        reject(response.statusMessage);
      } else {
        var ret = [];
        body.forEach(function(skin) {
          ret.push(skin);
        });
        resolve(ret);
      }
    });
  }) ;
}

function getOvhDomain(name) {
  winston.log('info','Get Ovh Domain: '+name);
  return new Promise(function(resolve, reject) {
     // Get the serviceName (name of your sms account)
    ovh.request('GET', '/domain/zone/'+targetDomain+'/record/'+name, function (err, domain) {
      if(err) {
        reject(err);
      }
      else {
        resolve(domain);
      }
    });
  });
}

function getOvhDomains() {
  winston.log('info','Get Ovh Domains: '+targetDomain);
  return new Promise(function(resolve, reject) {
     // Get the serviceName (name of your sms account)
    ovh.request('GET', '/domain/zone/'+targetDomain+'/record?fieldType=CNAME', function (err, domains) {
      if(err) {
        reject(err);
      }
      else {
        resolve(domains);
      }
    });
  })
  .then((domains) => {
    var funcs = domains.map(getOvhDomain);
    return Promise.all(funcs);
  })
  .then((domains) => {
    return new Promise(function(resolve) {
      resolve(domains.map((domain) => { return domain.subDomain; }));
    });
  });
}

function createOvh(name) {
  winston.log('info','Create Ovh: Create CNAME '+name);

  if (argv.dry) {
    return Promise.resolve(true);
  }

  return new Promise(function(resolve, reject) {
    resolve(true);
    // Get the serviceName (name of your sms account)
    var postData = {
      fieldType:'CNAME',
      subDomain: name,
      target: targetDomain+'.',
      ttl:0
    };
    ovh.request('POST', '/domain/zone/'+targetDomain+'/record', postData, function (err, domain) {
      if(err) {
        reject(err);
      }
      else {
        resolve(domain);
      }
    });
  });
}

function refreshOvh() {
  winston.log('info','Refresh Ovh: '+targetDomain);

  if (argv.dry) {
    return Promise.resolve(true);
  }

  return new Promise(function(resolve, reject) {
    resolve(true);
    // Get the serviceName (name of your sms account)
    ovh.request('POST', '/domain/zone/'+targetDomain+'/refresh', {}, function (err, data) {
      if(err) {
        reject(err);
      }
      else {
        winston.log('info', 'refreshOvh data:'+data);
        resolve(data);
      }
    });
  });
}


if (argv.c) {
  var funcs = [];

  getServices(true)
  .then((services) => {
    services.forEach((service) => {
      funcs.push(rmServices(service.ID));
    });
  });

  Promise.all(funcs);
} else {
  getOvhDomains()
  .then((domains) => {
    getServices()
    .then((services) => {
      var mustRefresh = false ;

      return getSkins()
      .then((skins) => {
        var funcs = [];
        skins.forEach((skin) => {
          var skinHeader = skin['header_name'];
          if (skinHeader && skinHeader !== '') {
            var name = skinHeader+'.'+targetDomain+':'+skinHeader;
            services.forEach((service, idx) => {
              if (name === service.ID) {
                services.splice(idx, 1);
              }
            });

            var wlUrl = skin['wl_url'];
            if (wlUrl && wlUrl !== '') {
              funcs.push(putService(wlUrl+':'+skinHeader, 'wl_ext'));
            } else {
              funcs.push(putService(name, 'wl'));
              if (domains.indexOf(skinHeader) === -1) {
                mustRefresh = true;
                funcs.push(createOvh(skinHeader));
              }
            }
          }
        });
        return Promise.all(funcs);
      })
      .then(() => {
        var funcs = [];

        services.forEach((service) => {
          funcs.push(rmServices(service.ID));
        });

        return Promise.all(funcs);
      })
      .then(() => {
        if (mustRefresh) {
          return refreshOvh();
        } else {
          return Promise.resolve(true);
        }
      });
    });
  })
  .catch((onRejected) => {
    winston.log('error',onRejected);
  });

}
