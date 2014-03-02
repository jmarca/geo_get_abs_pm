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
var get_from_vds_distance=get_abs_pm.abs_postmile_vds_multiline({'username':puser
                                                             ,'password':ppass
                                                             ,'host':phost
                                                             ,'port':pport})
var get_from_dead_reckoning=get_abs_pm.abs_postmile_dead_reckoning({'username':puser
                                                             ,'password':ppass
                                                             ,'host':phost
                                                             ,'port':pport})

var get_from_pm=get_abs_pm.ca_postmile_to_abs_postmile({'username':puser
                                                       ,'password':ppass
                                                       ,'host':phost
                                                       ,'port':pport})
var get_geojson=get_abs_pm.get_geojson({'username':puser
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

function get_abspm(opts,outercb){
    console.log(['firing',opts.wim_id,opts.county].join(' '))
    var result,error
    async.waterfall([function(cb1){
                         get_from_vds({'wim_id':opts.wim_id
                                      ,'county':opts.county}
                                     ,function(e,r){
                                          var e1,r1
                                          if(!e){
                                              result = r
                                              e1='exit'
                                          }else{
                                              if(/line_locate_point/.test(e.routine)){
                                                  // don't bother trying via dead reckoning, but do try based on distance only
                                                  get_from_vds_distance({'wim_id':opts.wim_id
                                                                        ,'county':opts.county}
                                                                       ,function(e,r){
                                                                            var e1,r1
                                                                            if(!e){
                                                                                result = r
                                                                                e1='exit'
                                                                            }else{
                                                                                // probably no nearby vds
                                                                                error = e
                                                                                e1 = e
                                                                            }
                                                                            return cb1(e1)
                                                                        })
                                                                        //console.log({'wim_id':opts.wim_id,'e1':e1})
                                                  return null
                                               }
                                          }
                                          //console.log({'wim_id':opts.wim_id,'e1':e1})
                                          return cb1(e1)
                                      })
                         return null
                     }
                    ,function(cb2){
                         get_from_dead_reckoning({'wim_id':opts.wim_id
                                                ,'county':opts.county}
                                     ,function(e,r){
                                          var e1,r1
                                          if(!e){
                                              result = r
                                              e1='exit'
                                          }else{
                                              error = e
                                          }
                                          //console.log({'wim_id':opts.wim_id,'e2':e1})
                                          return cb2(e1)
                                      })
                         return null
                     }]
                   ,function(e){
                        if(error !== undefined){
                            // need to scoop up geojson at least
                            //console.log('calling get geojson, '+opts.wim_id)
                            return get_geojson({'wim_id':opts.wim_id
                                                ,'county':opts.county}
                                               ,function(e,r){
                                                    return outercb(error,r)
                                                })
                        }
                        // okay, error is undef, so just return
                        console.log('returning without an extra call to get geojson')
                        return outercb(error,result)
                    })
    return null
}

function get_pm(wim,cb){
    var key = _.keys(wim.properties)[0]
    var p = wim.properties[key]
    get_abspm({'wim_id':wim._id
              ,'route':p.freeway
              ,'county':p.county
              ,'ca_pm':p.cal_pm_numeric}
             ,function(e,result){
                  //console.log('handling '+wim._id)

                  if(e) {
                      if(/line_locate_point/.test(e.routine)){
                          // dealing with a multiline, skip it
                          wim.properties[key].multiline = true
                      }else{
                          if(/line_interpolate_point/.test(e.routine)){
                              // problem with length
                              wim.properties[key].toolong = true
                          }else{
                              wim.properties[key].abspmerror = e
                          }
                      }
                  }
                  wim.properties[key].abs_pm = result.abs_pm
                  wim.properties[key].geojson = JSON.parse(result.geojson)
                  return cb(null,wim)
              })
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


var q = async.queue(fix_a_wim,1)

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