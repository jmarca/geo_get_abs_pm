/*global console */
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

var get_abs_pm = require('../lib/get_absolute_post_mile')

var get_from_vds=get_abs_pm.abs_postmile_based_on_vds_abs_pm({'username':puser
                                                             ,'password':ppass
                                                             ,'host':phost
                                                             ,'port':pport})

var get_from_pm=get_abs_pm.ca_postmile_to_abs_postmile({'username':puser
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
               },function(e){
                     return cb(null,wim)
                 }
              );
    return null
}

function get_abspm(opts,cb){
    return get_from_vds({'wim_id':opts.wim_id
                        ,'county':opts.county},cb)
}
function get_pm(wim,cb){
    async.each(_.keys(wim.properties)
              ,function(key,cb2){
                   var p = wim.properties[key]
                   console.log(wim._id)
                   get_abspm({'wim_id':wim._id
                             ,'route':p.freeway
                             ,'county':p.county
                             ,'ca_pm':p.cal_pm_numeric}
                            ,function(e,result){
                                 if(e) {
                                     if(/line_locate_point/.test(e.routine)){
                                         // dealing with a multiline, skip it
                                         wim.properties[key].multiline = true
                                         return cb2()
                                     }
                                     if(/line_interpolate_point/.test(e.routine)){
                                         // problem with length
                                         wim.properties[key].toolong = true
                                         return cb2()
                                     }
                                     wim.properties[key].abspmerror = e
                                     return cb2()
                                 }
                                 console.log(JSON.stringify(wim.properties))
                                 wim.properties[key].abs_pm = result.abs_pm
                                 wim.properties[key].geojson = result.geojson
                                 console.log(wim.properties)
                                 return cb2()
                             })
                   return null
               },function(e){

                     if(e) return cb(e,wim)
                     return cb(null,wim)
                 }
              );
    return null
}

function fix_a_wim(wim,cb2){
    async.waterfall([function(cb3){
                         return cb3(null,wim)
                     }
                    ,get_wim_county
                    ,get_pm
                    ]
                   ,function(e,r){

                        if(e){
                            console.log('choke in fix_a_wim')
                            console.log(r)
                            throw new Error(e)
                        }
                        wim.properties = _.clone(r.properties,true)
                        return cb2()
                    })
    return null
}


var q = async.queue(fix_a_wim,5)

function fix_wims(opts,cb_fix_wims){
    if(cb_fix_wims===undefined){
        cb_fix_wims = opts
        opts = {}
    }
    get_wims(opts,function(e,result){
        if(e) return cb_fix_wims(e)
        var wims=[]
        q.drain = function(){
            console.log('finished processing wims')
            console.log({'result_length':result.length
                        ,'wims.length':wims.length})
            //get_abspm.done()
            return cb_fix_wims(null, wims)
        }

        // for each wim, get the correct abs post mile
        // then bulk update
        _.each(result,function(r){
            q.push(r,function(err){
                if(!err){
                    wims.push(r)
                }
                return null
            })
        });

        return null
    })
}
exports.fix_wims=fix_wims