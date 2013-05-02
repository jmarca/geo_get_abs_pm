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
    console.log(connectionString)
    // the service accepts a ca postmile (county line based miles) and
    // a highway, and a county, and returns the absolue mile post for
    // that location
    var validate_county = /\d\d\d/;
    var digits = /(\d*)/
    return function(req,cb){
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
                    cb(null,+row.ca_pm_abs_pm)
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
module.exports = ca_postmile_to_abs_postmile
