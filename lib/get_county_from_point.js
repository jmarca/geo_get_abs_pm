/**
 * use postgis and a point to return the containing county
 *
 */

var pg = require('pg')
var _ = require('lodash')

function get_county_from_point(options){
    var dbname = options.db || 'geocoder'
    var host = options.host|| '127.0.0.1';
    var username = options.username
    var password = options.password
    var port = options.port || 5432;
    var connectionString = "pg://"+username+":"+password+"@"+host+":"+port+"/"+dbname;
    // the service accepts a geojson point and returns the county that
    // contains that point
    return function(req,cb){
        if( req.geojson === undefined) return cb('req.geojson is required')
        // note that the query function is hardcoded, for now
        // var query ="select countyfp from county c where st_covers(c.the_geom,st_transform(st_setsrid(ST_GeomFromGeoJSON('"
        //           +JSON.stringify(req.geojson)
        //           +"'),4326),4269))"
        // that didn't work for WIM site 8 (conejo)
        var query ="select name,countyfp,st_distance(c.the_geom,st_transform(st_setsrid(ST_GeomFromGeoJSON('"
                  +JSON.stringify(req.geojson)
                  +"'),4326),4269)) as dist from county c order by dist limit 1"
        console.log(query)
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
                    cb(null,row.countyfp)
                    once = true
                }else{
                    throw new Error('got more than one row from sql query')
                }
                return null
            })
            result.on('end',function(){
                return done()
            })
            return null
        })

        return null;
    }
}
module.exports = get_county_from_point
