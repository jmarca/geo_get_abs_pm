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
    console.log('get county for '+wim._id)
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
               },function(e){
                     return cb(null,wim)
                 }
              );
    return null
}

function get_pm(wim,cb){
    console.log('get pm for '+wim._id)
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
               },function(e){
                     return cb(null,wim)
                 }
              );
    return null
}

function fix_wims(opts,cb){
    if(cb===undefined){
        cb = opts
        opts = {}
    }
    get_wims(opts,function(e,result){
        // for each wim, get the correct abs post mile
        // then bulk update
        console.log('got result '+result.length)
        if(e) return cb(e)
        async.eachLimit(result,5
                       ,function(wim,cb2){
                            async.waterfall([function(cb3){
                                                 console.log('kickoff queries for '+wim._id)
                                                 return cb3(null,wim)
                                             }
                                            ,get_wim_county
                                            ,get_pm
                                            ]
                                           ,cb2)
                            return null
                        }
                       ,cb)
        return null
    })
}
exports.fix_wims=fix_wims