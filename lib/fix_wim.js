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

var _ = require('lodash')
var async = require('async')
var get_wims = require('./get_all_wims')

var get_abspm = require('./get_absolute_post_mile')({'username':puser
                                                    ,'password':ppass
                                                    ,'host':phost
                                                    ,'port':pport})
var get_county= require('./get_county_from_point')({'username':puser
                                                   ,'password':ppass
                                                   ,'host':phost
                                                   ,'port':pport})


function get_wim_county(wim,cb){
    async.each(_.keys(wim.properties)
              ,function(key,cb2){
                   var p = wim.properties[key]
                   get_county({'geojson':p.geojson}
                             ,function(e,result){
                                  if(e) return cb2(e)
                                  wim.properties[key].county = result
                                  return cb2()
                              })
                   return null
               });
    return null
}

function get_pm(wim,cb){
    async.each(_.keys(wim.properties)
              ,function(key,cb2){
                   var p = wim.properties[key]
                   get_abspm({'route':p.freeway
                             ,'county':p.county
                             ,'ca_pm':p.cal_pm_numeric}
                            ,function(e,result){
                                 if(e) return cb2(e)
                                 wim.properties[key].abs_pm = result
                                 return cb2()
                             })
                   return null
               });
    return null
}

get_wims(function(e,result){
    // for each wim, get the correct abs post mile

    // then bulk update

})
