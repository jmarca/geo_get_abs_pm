/**
 * use postgis and knowledge of freeway line layer to compute absolute
 * postmile for WIM stations.
 *
 *
 */

// strategy, pre-parallelizing:
// get WIM station
// place on correct freeway
// compute postmile from county line, and from start of freeway
// (review HPMS code to see how I did that there)
//
// I expect that WIM postmile (county) will be off from that computed
// via postgis freeway length.  So adjust absolute postmile?
//
// I could find nearest VDS on link, but there might not be such a thing
//
// The problem is possibly flipping the order of VDS
//
// What I could also do is just use MRB, pre and post detectors, plus
// distance, to figure out the absolute post mile
//
// So.  for those WIM sites that have a pre or post VDS site, use Pre
// or Post site, plus length of segment from WIM site to VDS site, to
// determine the postmile of WIM site.
//
// For those WIM sites without a pre or post VDS site, use county
// postmile plus length of roadway from start to county line.
//

var pg = require('pg')
var _ = require('lodash')

function ca_postmile_to_abs_postmile(options){
    var dbname = options.db || 'geocoder'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var validate_county = /\d\d\d/;
    var digits = /(\d*)/
    var doit = function(req,cb){
        if( req.county === undefined) return cb('req.county is required')
        if( ! validate_county.test(req.county )) return cb('req.county must be three digit fips code')
        var county = "'"+req.county+"'"

        if(req.ca_pm === undefined) return cb('req.ca_pm required (the post mile from the county border, as a number)')
        var ca_pm = +req.ca_pm
        if(_.isNaN(ca_pm) ) return cb(' req.ca_pm required (the post mile from the county border, as a number)')

        if(req.route === undefined) return cb('req.route is required (number of the route being matched)')
        var result = digits.exec(req.route)
        var route = result[1]
        if(route === undefined ) return cb('req.route is required (number of the route being matched)')
        route = +route
        if(_.isNaN(route)) cb('req.route is required (number of the route being matched)')


        // ready to go

        // note that the query function is hardcoded, for now
        var query = 'select osm.ca_pm_abs_pm('
                  + [route,ca_pm,county].join(',')
                  +')'
        //console.log(query)
        pg.connect(connectionString,function(err,client,done){
            if(err){
                console.log('connection err '+JSON.stringify(err))
                done()
                return cb(err)
            }
            var result = client.query(query)
            var once = false
            result.on('row',function(row){
                if(!once){
                    cb(null,+row.ca_pm_abs_pm)
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(result){
                done()
                return null
            })
            result.on('error',function(err){
                //done(1)
                cb(err)
                return null
            })
            return null
        })

        return null;
    }

    doit.done = function(){
        pg.end()
        return null;
    }
    return doit
}


function abs_postmile_dead_reckoning(options){
    var dbname = options.db || 'spatialvds'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var digits = /(\d+)/
    var validate_county = /\d\d\d/;

    var doit = function(req,cb){
        if( req.county === undefined) return cb('req.county is required')
        if( ! validate_county.test(req.county )) return cb('req.county must be three digit fips code')
        var county = req.county

        if(req.wim_id === undefined) return cb('req.wim_id is a required param (number of the wim site)')
        var result = digits.exec(req.wim_id)
        var wim_id = result[1]
        if(wim_id === undefined ) return cb('req.wim_id needs to contain wim id number')
        wim_id = +wim_id
        if(_.isNaN(wim_id)) cb('req.wim_id is required (number of the wim site)')


        var query = ["with "
                    ,"wim_info as ("
                    ,"    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom"
                    ,"    from wim_stations w"
                    ,"    join wim_points_4326 wp on(w.site_no =wp.wim_id)"
                    ,"    join geom_points_4326 using (gid)"
                    ,"    join wim_freeway wf on(wf.wim_id=w.site_no)"
                    ,"    where site_no="+wim_id
                    ,")"
                    ,"select st_asgeojson(wim_geom,12,2) as geojson,"
                    ,"       tempseg.wim_abs_pm(wim_freeway,"
                    ,"                          st_asewkt(wim_geom))"
                    ,"                          as abs_pm"
                    ,"from wim_info"].join('\n')

        // ready to go
        //console.log(query)
        pg.connect(connectionString,function(err,client,done){
            if(err){
                console.log('connection err '+JSON.stringify(err))
                done()
                return cb(err)
            }
            var result = client.query(query)
            var once = false
            result.on('row',function(row){
                if(!once){
                    cb(null,{'geojson':row.geojson
                            ,'abs_pm':+row.abs_pm})
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(result){
                if(!once){
                    once=true
                    console.log('firing callback with no rows')
                    cb('no rows')
                }
                done()
                return null
            })
            result.on('error',function(err){
                //done(1)
                if(!once){
                    once=true
                    console.log('firing callback with error')
                    cb(err)
                }
                return null
            })
            return null
        })

        return null;
    }

    doit.done = function(){
        pg.end()
        return null;
    }
    return doit
}

function abs_postmile_vds_multiline(options){
    var dbname = options.db || 'spatialvds'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var digits = /(\d+)/
    var validate_county = /\d\d\d/;

    var doit = function(req,cb){
        if( req.county === undefined) return cb('req.county is required')
        if( ! validate_county.test(req.county )) return cb('req.county must be three digit fips code')
        var county = req.county

        if(req.wim_id === undefined) return cb('req.wim_id is a required param (number of the wim site)')
        var result = digits.exec(req.wim_id)
        var wim_id = result[1]
        if(wim_id === undefined ) return cb('req.wim_id needs to contain wim id number')
        wim_id = +wim_id
        if(_.isNaN(wim_id)) cb('req.wim_id is required (number of the wim site)')


        var query = ["with "
                    ,"    cnty as ("
                    ,"    select cf.name,"
                    ,"        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)"
                    ,"        as the_geom"
                    ,"    from carb_counties_aligned_03 cc"
                    ,"    join counties_fips cf on (lower(cf.name)=lower(cc.name))"
                    ,"    where fips='06"+county+"'"
                    ,"),"
                    ,"wim_info as ("
                    ,"    select w.site_no,wf.freeway_id as wim_freeway,SUBSTRING(w.cal_pm, '(\\d+\\.?\\d*){1,1}') as wim_cal_pm,geom as wim_geom"
                    ,"    from wim_stations w"
                    ,"    join wim_points_4326 wp on(w.site_no =wp.wim_id)"
                    ,"    join geom_points_4326 using (gid)"
                    ,"    join wim_freeway wf on(wf.wim_id=w.site_no)"
                    ,"    where site_no="+wim_id
                    ,"),"
                    ,"vds_info as ("
                    ,"  select vds.vds_id,vds.abs_pm as vds_abs_pm, SUBSTRING(vds.cal_pm,'(\\d+\\.?\\d*){1,1}') as vds_cal_pm,geom as vds_geom,"
                    ,"    w.*, st_length(st_transform(st_makeline(geom,wim_geom),32611))*(0.621371/1000) as dist"
                    ,"    from vds_geoview_full vds"
                    ,"    join cnty on (st_contains(cnty.the_geom,vds.geom))"
                    ,"    join wim_info w on (vds.freeway_id = w.wim_freeway)"
                    ,"    where vds.abs_pm is not null"
                    ,"    order by dist"
                    ,"    limit 1"
                    ,")"
                    ,"select st_asgeojson(wim_geom,12,2) as geojson,"
                    ,"       case when wim_cal_pm > vds_cal_pm then vds_abs_pm + dist"
                    ,"            else vds_abs_pm - dist"
                    ,"            end as abs_pm"
                    ,"from vds_info"].join('\n')


        // ready to go
        //console.log(query)
        pg.connect(connectionString,function(err,client,done){
            if(err){
                console.log('connection err '+JSON.stringify(err))
                done()
                return cb(err)
            }
            var result = client.query(query)
            var once = false
            result.on('row',function(row){
                if(!once){
                    cb(null,{'geojson':row.geojson
                            ,'abs_pm':+row.abs_pm})
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(result){
                if(!once){
                    once=true
                    console.log('firing callback with no rows')
                    cb('no rows')
                }
                done()
                return null
            })
            result.on('error',function(err){
                //done(1)
                if(!once){
                    once=true
                    console.log('firing callback with error')
                    cb(err)
                }
                return null
            })
            return null
        })

        return null;
    }

    doit.done = function(){
        pg.end()
        return null;
    }
    return doit
}
function abs_postmile_based_on_vds_abs_pm(options){
    var dbname = options.db || 'spatialvds'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var digits = /(\d+)/
    var validate_county = /\d\d\d/;

    var doit = function(req,cb){
        if( req.county === undefined) return cb('req.county is required')
        if( ! validate_county.test(req.county )) return cb('req.county must be three digit fips code')
        var county = req.county

        if(req.wim_id === undefined) return cb('req.wim_id is a required param (number of the wim site)')
        var result = digits.exec(req.wim_id)
        var wim_id = result[1]
        if(wim_id === undefined ) return cb('req.wim_id needs to contain wim id number')
        wim_id = +wim_id
        if(_.isNaN(wim_id)) cb('req.wim_id is required (number of the wim site)')


        var query = ["with "
                    ,"    cnty as ("
                    ,"    select cf.name,"
                    ,"        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)"
                    ,"        as the_geom"
                    ,"    from carb_counties_aligned_03 cc"
                    ,"    join counties_fips cf on (lower(cf.name)=lower(cc.name))"
                    ,"    where fips='06"+county+"'"
                    ,"),"
                    ,"wim_info as ("
                    ,"    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom"
                    ,"    from wim_stations w"
                    ,"    join wim_points_4326 wp on(w.site_no =wp.wim_id)"
                    ,"    join geom_points_4326 using (gid)"
                    ,"    join wim_freeway wf on(wf.wim_id=w.site_no)"
                    ,"    where site_no="+wim_id
                    ,"),"
                    ,"vds_info as ("
                    ,"    select vds.vds_id,vds.abs_pm as vds_abs_pm,geom as vds_geom,w.*,st_distance(geom,w.wim_geom) as dist"
                    ,"    from vds_geoview_full vds"
                    ,"    join cnty on (st_contains(cnty.the_geom,vds.geom))"
                    ,"    join wim_info w on (vds.freeway_id = w.wim_freeway)"
                    ,"    where vds.abs_pm is not null"
                    ,"    order by dist"
                    ,"    limit 1"
                    ,")"
                    ,"select st_asgeojson(wim_geom,12,2) as geojson,"
                    ,"       tempseg.wim_abs_pm(wim_freeway,"
                    ,"                          st_asewkt(wim_geom),"
                    ,"                          st_asewkt(vds_geom),"
                    ,"                          vds_abs_pm) as abs_pm"
                    ,"from vds_info"].join('\n')

        // ready to go
        //console.log(query)
        pg.connect(connectionString,function(err,client,done){
            if(err){
                console.log('connection err '+JSON.stringify(err))
                done()
                return cb(err)
            }
            var result = client.query(query)
            var once = false
            result.on('row',function(row){
                if(!once){
                    cb(null,{'geojson':row.geojson
                            ,'abs_pm':+row.abs_pm})
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(result){
                if(!once){
                    once=true
                    console.log('firing callback with no rows')
                    cb('no rows')
                }
                done()
                return null
            })
            result.on('error',function(err){
                //done(1)
                if(!once){
                    once=true
                    console.log('firing callback with error')
                    cb(err)
                }
                return null
            })
            return null
        })

        return null;
    }

    doit.done = function(){
        pg.end()
        return null;
    }
    return doit
}

function get_geojson(options){
    var dbname = options.db || 'spatialvds'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var digits = /(\d+)/
    var validate_county = /\d\d\d/;

    var doit = function(req,cb){
        if( req.county === undefined) return cb('req.county is required')
        if( ! validate_county.test(req.county )) return cb('req.county must be three digit fips code')
        var county = req.county

        if(req.wim_id === undefined) return cb('req.wim_id is a required param (number of the wim site)')
        var result = digits.exec(req.wim_id)
        var wim_id = result[1]
        if(wim_id === undefined ) return cb('req.wim_id needs to contain wim id number')
        wim_id = +wim_id
        if(_.isNaN(wim_id)) cb('req.wim_id is required (number of the wim site)')


        var query = ["with "
                    ,"    cnty as ("
                    ,"    select cf.name,"
                    ,"        st_transform(st_buffer(st_transform(the_geom,32611),5),4326)"
                    ,"        as the_geom"
                    ,"    from carb_counties_aligned_03 cc"
                    ,"    join counties_fips cf on (lower(cf.name)=lower(cc.name))"
                    ,"    where fips='06"+county+"'"
                    ,"),"
                    ,"wim_info as ("
                    ,"    select w.site_no,wf.freeway_id as wim_freeway,w.cal_pm,geom as wim_geom"
                    ,"    from wim_stations w"
                    ,"    join wim_points_4326 wp on(w.site_no =wp.wim_id)"
                    ,"    join geom_points_4326 using (gid)"
                    ,"    join wim_freeway wf on(wf.wim_id=w.site_no)"
                    ,"    where site_no="+wim_id
                    ,")"
                    ,"select st_asgeojson(wim_geom,12,2) as geojson"
                    ,"from wim_info"].join('\n')

        // ready to go
        // console.log(query)
        pg.connect(connectionString,function(err,client,done){
            if(err){
                console.log('connection err '+JSON.stringify(err))
                done()
                return cb(err)
            }
            var result = client.query(query)
            var once = false
            result.on('row',function(row){
                if(!once){
                    cb(null,{'geojson':row.geojson})
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(result){
                if(!once){
                    once=true
                    console.log('firing callback with no rows')
                    cb('no rows')
                }
                done()
                return null
            })
            result.on('error',function(err){
                //done(1)
                if(!once){
                    once=true
                    console.log('firing callback with error')
                    cb(err)
                }
                return null
            })
            return null
        })

        return null;
    }

    doit.done = function(){
        pg.end()
        return null;
    }
    return doit
}

exports.ca_postmile_to_abs_postmile=ca_postmile_to_abs_postmile
exports.abs_postmile_based_on_vds_abs_pm=abs_postmile_based_on_vds_abs_pm
exports.abs_postmile_vds_multiline=abs_postmile_vds_multiline
exports.abs_postmile_dead_reckoning=abs_postmile_dead_reckoning
exports.get_geojson=get_geojson
