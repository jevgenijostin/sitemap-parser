/*
jshint node:true,
esnext: true
*/

/*
 * Edited by Jevgeni Jostin 2016. 
 * Added GZIP Support
 * example: https://www.decathlon.de/sitemap-produit-de.xml.gz
 */

/*
 * Sitemap Parser
 *
 * Copyright (c) 2014 Sean Thomas Burke
 * Licensed under the MIT license.
 */
'use strict';

var xmlParse = require("xml2js").parseString;
var http = require('http');
var _ = require('underscore');
var zlib = require("zlib");

var sitemap = module.exports = Object;

sitemap.setURL = function(url) {
  this.url = url;
};

sitemap.parse = function(url, callback) {
  thisUrl = url;
  var buffer = [];

  http = thisUrl.includes('https') ? require('https') : require('http');

  http.get(thisUrl, function(res) {
    if (res.statusCode === 200 && thisUrl.includes('.gz')) {

      var gunzip = zlib.createGunzip();
      res.pipe(gunzip);

      gunzip.on('data', function(data) {
        buffer.push(data.toString());

      }).on('end', function() {
        xmlParse(buffer.join(''), function(err, data) {
          callback(null, data);
        });

      }).on('error', function(e) {
        callback(e, 'Error');
      });
    } else if (res.statusCode === 200) {
      var body = '';

      res.on('data', function(chunk) {
        body += chunk;
      });

      res.on('end', function() {
        xmlParse(body, function(err, data) {
          callback(null, data);
        });
      });

      res.on('error', function(e) {
        callback(e, 'Error');
      }); // end on ERROR

    } else {
      callback(null, 'Error');
    }

  }).on('error', function(e) {
    callback(e, 'Error');
  });

};

sitemap.getSites = function(url, callback) {
  var self = this;
  var d, s, error, sites = [];
  var sUrlSize = 1;
  var parseCnt = 0;
  this.parse(url, function read(err, data) {
    if (!err) {
      if (d = data.urlset) {
        sites.push(_.flatten(_.pluck(d.url, "loc")));
        sites = _.flatten(sites);
        parseCnt++;
        if (parseCnt === sUrlSize) {
          callback(error, sites);
        }
      } else if (s = data.sitemapindex) {
        var sitemapUrls = _.flatten(_.pluck(s.sitemap, "loc"));
        sUrlSize = _.size(sitemapUrls);

        _.each(sitemapUrls, function(url) {
          self.parse(url, read);
        });
      } else {
        error = "no valid xml";
      }
    } else {
      error = err;
      //callback(err,sites);
    }
  });
};