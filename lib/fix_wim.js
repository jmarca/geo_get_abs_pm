/**
 * sort the absolute postmile
 *
 */
var env = process.env;
var puser = env.PSQL_USER
var ppass = env.PSQL_PASS
var phost = env.PSQL_HOST || 'localhost'
var pport = env.PSQL_PORT || 5432

var cuser = env.COUCHDB_USER ;
var cpass = env.COUCHDB_PASS ;
var chost = env.COUCHDB_HOST || 'localhost';
var cport = env.COUCHDB_PORT || 5984;

var async = require('async')

var get_abspm = require('../.')({'username':puser
                                ,'password':ppass
                                ,'host':phost
                                ,'port':pport})
